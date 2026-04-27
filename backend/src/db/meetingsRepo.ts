import { pool } from "./connection";

export type DbMeeting = {
  id: string;
  teams_meeting_id: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_email: string | null;
  participants: unknown | null;
  transcript: string | null;
  teams_summary: string | null;
  ai_summary: string | null;
  action_items: unknown | null;
  topics: unknown | null;
  created_at: string;
  processed_at: string | null;
  notification_sent_at: string | null;
  status?: string | null;
  last_error?: string | null;
  failed_attempts?: number;
};

export async function upsertMeeting(input: {
  teamsMeetingId: string;
  subject?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  organizerEmail?: string | null;
  participants?: unknown | null;
  transcript?: string | null;
  teamsSummary?: string | null;
  aiSummary?: string | null;
  actionItems?: unknown | null;
  topics?: unknown | null;
  processedAt?: Date | null;
  notificationSentAt?: Date | null;
  status?: string | null;
  lastError?: string | null;
  failedAttempts?: number | null;
}): Promise<DbMeeting> {
  const res = await pool.query<DbMeeting>(
    `
      insert into meetings (
        teams_meeting_id,
        subject,
        start_time,
        end_time,
        organizer_email,
        participants,
        transcript,
        teams_summary,
        ai_summary,
        action_items,
        topics,
        processed_at,
        notification_sent_at,
        status,
        last_error,
        failed_attempts
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      on conflict (teams_meeting_id) do update set
        subject = coalesce(excluded.subject, meetings.subject),
        start_time = coalesce(excluded.start_time, meetings.start_time),
        end_time = coalesce(excluded.end_time, meetings.end_time),
        organizer_email = coalesce(excluded.organizer_email, meetings.organizer_email),
        participants = coalesce(excluded.participants, meetings.participants),
        transcript = coalesce(excluded.transcript, meetings.transcript),
        teams_summary = coalesce(excluded.teams_summary, meetings.teams_summary),
        ai_summary = coalesce(excluded.ai_summary, meetings.ai_summary),
        action_items = coalesce(excluded.action_items, meetings.action_items),
        topics = coalesce(excluded.topics, meetings.topics),
        processed_at = coalesce(excluded.processed_at, meetings.processed_at),
        notification_sent_at = coalesce(excluded.notification_sent_at, meetings.notification_sent_at),
        status = coalesce(excluded.status, meetings.status),
        last_error = coalesce(excluded.last_error, meetings.last_error),
        failed_attempts = coalesce(excluded.failed_attempts, meetings.failed_attempts)
      returning *;
    `,
    [
      input.teamsMeetingId,
      input.subject ?? null,
      input.startTime ? input.startTime.toISOString() : null,
      input.endTime ? input.endTime.toISOString() : null,
      input.organizerEmail ?? null,
      input.participants ?? null,
      input.transcript ?? null,
      input.teamsSummary ?? null,
      input.aiSummary ?? null,
      input.actionItems ?? null,
      input.topics ?? null,
      input.processedAt ? input.processedAt.toISOString() : null,
      input.notificationSentAt ? input.notificationSentAt.toISOString() : null,
      input.status ?? null,
      input.lastError ?? null,
      input.failedAttempts ?? null
    ]
  );

  return res.rows[0]!;
}

export async function getMeetings(params: {
  q?: string;
  start?: Date;
  end?: Date;
  page: number;
  limit: number;
}): Promise<{ rows: DbMeeting[]; total: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(subject ilike $${values.length} or ai_summary ilike $${values.length})`);
  }
  if (params.start) {
    values.push(params.start.toISOString());
    where.push(`start_time >= $${values.length}`);
  }
  if (params.end) {
    values.push(params.end.toISOString());
    where.push(`start_time <= $${values.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const offset = (params.page - 1) * params.limit;

  const countRes = await pool.query<{ count: string }>(
    `select count(*)::text as count from meetings ${whereSql};`,
    values
  );

  values.push(params.limit);
  values.push(offset);

  const listRes = await pool.query<DbMeeting>(
    `
      select *
      from meetings
      ${whereSql}
      order by start_time desc nulls last, created_at desc
      limit $${values.length - 1}
      offset $${values.length};
    `,
    values
  );

  return { rows: listRes.rows, total: Number(countRes.rows[0]?.count ?? 0) };
}

export async function getMeetingById(id: string): Promise<DbMeeting | null> {
  const res = await pool.query<DbMeeting>("select * from meetings where id = $1", [id]);
  return res.rows[0] ?? null;
}

export async function findMeetingByTeamsId(
  teamsMeetingId: string
): Promise<DbMeeting | null> {
  const res = await pool.query<DbMeeting>(
    "select * from meetings where teams_meeting_id = $1",
    [teamsMeetingId]
  );
  return res.rows[0] ?? null;
}

export async function markMeetingFailed(params: {
  teamsMeetingId: string;
  error: string;
}): Promise<void> {
  await pool.query(
    `
      update meetings
      set
        status = 'failed',
        last_error = $2,
        failed_attempts = failed_attempts + 1
      where teams_meeting_id = $1
    `,
    [params.teamsMeetingId, params.error]
  );
}

