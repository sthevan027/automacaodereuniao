import { getEnv } from "../config/env";
import { listRecentOnlineMeetings, getLatestTranscriptText } from "../graph/meetings";
import { processMeetingWithAi } from "../ai/processor";
import { findMeetingByTeamsId, upsertMeeting } from "../db/meetingsRepo";
import { sendMeetingEmail } from "../notifications/email";
import { postTeamsWebhook } from "../notifications/teams";

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

export async function syncOnce(): Promise<{ processed: number; skipped: number }> {
  const meetings = await listRecentOnlineMeetings({
    userId: env.GRAPH_USER_ID,
    lookbackHours: env.GRAPH_LOOKBACK_HOURS
  });

  let processed = 0;
  let skipped = 0;

  for (const m of meetings) {
    const existing = await findMeetingByTeamsId(m.id);
    if (existing?.processed_at) {
      skipped += 1;
      continue;
    }

    const subject = m.subject ?? null;
    const organizerEmail = m.organizer?.emailAddress?.address ?? null;
    const participants = parseParticipants(m);
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
      subject,
      startTime: m.startDateTime ? new Date(m.startDateTime) : null,
      endTime: m.endDateTime ? new Date(m.endDateTime) : null,
      organizerEmail,
      participants,
      transcript,
      teamsSummary: null,
      aiSummary: ai.ai_summary,
      actionItems: ai.action_items,
      topics: ai.topics,
      processedAt: new Date()
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
      notificationSentAt: new Date()
    });

    processed += 1;
  }

  return { processed, skipped };
}

