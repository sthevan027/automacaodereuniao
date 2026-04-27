import { getEnv } from "../config/env";
import { listRecentOnlineMeetings, getLatestTranscriptText } from "../graph/meetings";
import { processMeetingWithAi } from "../ai/processor";
import { findMeetingByTeamsId, markMeetingFailed, upsertMeeting } from "../db/meetingsRepo";
import { sendMeetingEmail } from "../notifications/email";
import { postTeamsWebhook } from "../notifications/teams";
import { logger } from "../lib/logger";

const env = getEnv();

function parseParticipants(m: any): Array<{ name?: string; email?: string }> {
  const out: Array<{ name?: string; email?: string }> = [];
  const attendees = m?.participants?.attendees ?? [];
  for (const a of attendees) {
    const name = a?.identity?.user?.displayName;
    const email = a?.upn ?? a?.email;
    if (name || email) out.push({ name, email });
  }
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function syncOnce(): Promise<{ processed: number; skipped: number }> {
  const startedAt = Date.now();
  const meetings = await listRecentOnlineMeetings({
    userId: env.GRAPH_USER_ID,
    lookbackHours: env.GRAPH_LOOKBACK_HOURS
  });

  const concurrency = 3;

  logger.info("Sync iniciado", { meetingsCount: meetings.length, concurrency });

  const outcomes = await mapWithConcurrency(meetings, concurrency, async (m) => {
    const meetingId = m.id;
    const existing = await findMeetingByTeamsId(m.id);
    const isDone = Boolean(existing?.processed_at && existing?.notification_sent_at);
    if (isDone) {
      logger.debug("Sync skip (já notificado)", { meetingId });
      return "skipped" as const;
    }

    const canRetryFailed =
      (existing?.status ?? null) === "failed" &&
      (existing?.failed_attempts ?? 0) < 3;

    if (existing?.processed_at && !existing?.notification_sent_at) {
      // já processou, só falta notificar
      const saved = existing;
      try {
        await sendMeetingEmail({
          subject: saved.subject ?? saved.teams_meeting_id,
          when: saved.start_time,
          aiSummary: saved.ai_summary,
          actionItems: (saved.action_items as any) ?? [],
          topics: (saved.topics as any) ?? []
        });

        await postTeamsWebhook({
          title: saved.subject ?? "Reunião sincronizada",
          summary: saved.ai_summary,
          actionItems: (saved.action_items as any) ?? []
        });

        await upsertMeeting({
          teamsMeetingId: m.id,
          status: "notified",
          lastError: null,
          notificationSentAt: new Date()
        });
        logger.info("Reunião notificada (reenvio)", { meetingId });
        return "processed" as const;
      } catch (e: any) {
        await markMeetingFailed({
          teamsMeetingId: m.id,
          error: e?.message ?? "Falha ao notificar"
        });
        logger.warn("Falha ao notificar reunião", {
          meetingId,
          error: e?.message ?? "erro"
        });
        return "failed" as const;
      }
    }

    if (existing?.processed_at && !canRetryFailed) {
      logger.debug("Sync skip (processado)", { meetingId });
      return "skipped" as const;
    }

    const subject = m.subject ?? null;
    const organizerEmail = m.organizer?.emailAddress?.address ?? null;
    const participants = parseParticipants(m);

    // marca como capturado/atualiza metadados
    await upsertMeeting({
      teamsMeetingId: m.id,
      subject,
      startTime: m.startDateTime ? new Date(m.startDateTime) : null,
      endTime: m.endDateTime ? new Date(m.endDateTime) : null,
      organizerEmail,
      participants,
      status: "captured",
      lastError: null
    });

    try {
      const transcript = await getLatestTranscriptText({
        userId: env.GRAPH_USER_ID,
        onlineMeetingId: m.id
      });

      const ai = await processMeetingWithAi({
        subject,
        organizerEmail,
        participants,
        transcript,
        teamsSummary: null
      });

      const saved = await upsertMeeting({
        teamsMeetingId: m.id,
        transcript,
        teamsSummary: null,
        aiSummary: ai.ai_summary,
        actionItems: ai.action_items,
        topics: ai.topics,
        processedAt: new Date(),
        status: "processed",
        lastError: null
      });

      await sendMeetingEmail({
        subject: saved.subject ?? saved.teams_meeting_id,
        when: saved.start_time,
        aiSummary: saved.ai_summary,
        actionItems: (saved.action_items as any) ?? [],
        topics: (saved.topics as any) ?? []
      });

      await postTeamsWebhook({
        title: saved.subject ?? "Reunião sincronizada",
        summary: saved.ai_summary,
        actionItems: (saved.action_items as any) ?? []
      });

      await upsertMeeting({
        teamsMeetingId: m.id,
        status: "notified",
        lastError: null,
        notificationSentAt: new Date()
      });

      logger.info("Reunião processada e notificada", { meetingId });
      return "processed" as const;
    } catch (e: any) {
      await markMeetingFailed({
        teamsMeetingId: m.id,
        error: e?.message ?? "Falha ao processar reunião"
      });
      logger.warn("Falha ao processar reunião", { meetingId, error: e?.message ?? "erro" });
      return "failed" as const;
    }
  });

  const processed = outcomes.filter((o) => o === "processed").length;
  const skipped = outcomes.filter((o) => o === "skipped").length;

  logger.info("Sync finalizado", {
    processed,
    skipped,
    failed: outcomes.filter((o) => o === "failed").length,
    durationMs: Date.now() - startedAt
  });

  return { processed, skipped };
}

