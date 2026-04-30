import { getEnv } from "../config/env";
import {
  getCopilotMeetingNotes,
  getLatestTranscriptText,
  listRecentOnlineMeetings
} from "../graph/meetings";
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

    if (existing?.status === "notified" || Boolean(existing?.notification_sent_at)) {
      logger.debug("Sync skip (já notificado)", { meetingId });
      return "skipped" as const;
    }

    const failedAttempts = existing?.failed_attempts ?? 0;
    if ((existing?.status ?? "") === "failed" && failedAttempts >= 3) {
      logger.debug("Sync skip (falhou e atingiu limite)", { meetingId, failedAttempts });
      return "skipped" as const;
    }

    const needsNotifyRetry =
      Boolean(existing?.processed_at) &&
      !existing?.notification_sent_at &&
      (existing?.status === "approved" ||
        existing?.status === "processed" ||
        existing?.status === "failed");

    if (needsNotifyRetry && existing) {
      const saved = existing;
      try {
        await sendMeetingEmail({
          subject: saved.subject ?? saved.teams_meeting_id,
          when: saved.start_time,
          summary: saved.ai_summary,
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
          failedAttempts: 0,
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

    if (existing?.status === "pending_review" || existing?.status === "rejected") {
      logger.debug("Sync skip (fluxo de revisão)", { meetingId, status: existing.status });
      return "skipped" as const;
    }

    const canRetryFailed =
      (existing?.status ?? "") === "failed" && failedAttempts < 3;

    if (existing?.processed_at && !canRetryFailed) {
      logger.debug("Sync skip (já capturado)", { meetingId });
      return "skipped" as const;
    }

    const subject = m.subject ?? null;
    const organizerEmail = m.organizer?.emailAddress?.address ?? null;
    const participants = parseParticipants(m);

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

      const teamsNotes =
        (await getCopilotMeetingNotes({
          userId: env.GRAPH_USER_ID,
          onlineMeetingId: m.id
        })) ?? null;

      await upsertMeeting({
        teamsMeetingId: m.id,
        transcript,
        teamsSummary: teamsNotes,
        aiSummary: null,
        actionItems: [],
        topics: [],
        processedAt: new Date(),
        status: "pending_review",
        lastError: null,
        failedAttempts: 0
      });

      logger.info("Reunião capturada — aguardando revisão manual", { meetingId });
      return "processed" as const;
    } catch (e: any) {
      await markMeetingFailed({
        teamsMeetingId: m.id,
        error: e?.message ?? "Falha ao capturar conteúdo da reunião"
      });
      logger.warn("Falha ao capturar reunião", { meetingId, error: e?.message ?? "erro" });
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
