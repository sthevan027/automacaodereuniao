import { describe, expect, it, vi } from "vitest";

vi.mock("../graph/meetings", () => ({
  listRecentOnlineMeetings: vi.fn(),
  getLatestTranscriptText: vi.fn()
}));

vi.mock("../ai/processor", () => ({
  processMeetingWithAi: vi.fn()
}));

vi.mock("../db/meetingsRepo", () => ({
  findMeetingByTeamsId: vi.fn(),
  upsertMeeting: vi.fn(),
  markMeetingFailed: vi.fn()
}));

vi.mock("../notifications/email", () => ({
  sendMeetingEmail: vi.fn()
}));

vi.mock("../notifications/teams", () => ({
  postTeamsWebhook: vi.fn()
}));

import { listRecentOnlineMeetings } from "../graph/meetings";
import { findMeetingByTeamsId, markMeetingFailed, upsertMeeting } from "../db/meetingsRepo";
import { processMeetingWithAi } from "../ai/processor";
import { sendMeetingEmail } from "../notifications/email";
import { postTeamsWebhook } from "../notifications/teams";
import { syncOnce } from "./sync";

describe("syncOnce", () => {
  it("não reprocessa para sempre quando failed_attempts >= 3", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([
      {
        id: "m1",
        subject: "S",
        startDateTime: null,
        endDateTime: null,
        organizer: null,
        participants: { attendees: [] }
      } as any
    ]);

    vi.mocked(findMeetingByTeamsId).mockResolvedValue({
      id: "db1",
      teams_meeting_id: "m1",
      subject: "S",
      start_time: null,
      end_time: null,
      organizer_email: null,
      participants: null,
      transcript: null,
      teams_summary: null,
      ai_summary: null,
      action_items: null,
      topics: null,
      created_at: new Date().toISOString(),
      processed_at: null,
      notification_sent_at: null,
      status: "failed",
      last_error: "boom",
      failed_attempts: 3
    });

    const r = await syncOnce();
    expect(r.skipped).toBe(1);
    expect(r.processed).toBe(0);

    expect(vi.mocked(upsertMeeting)).not.toHaveBeenCalled();
    expect(vi.mocked(processMeetingWithAi)).not.toHaveBeenCalled();
    expect(vi.mocked(sendMeetingEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(postTeamsWebhook)).not.toHaveBeenCalled();
    expect(vi.mocked(markMeetingFailed)).not.toHaveBeenCalled();
  });

  it("tenta reenviar notificação quando status failed ainda sem notificação (e abaixo do limite)", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([
      {
        id: "m1",
        subject: "S",
        startDateTime: null,
        endDateTime: null,
        organizer: null,
        participants: { attendees: [] }
      } as any
    ]);

    vi.mocked(findMeetingByTeamsId).mockResolvedValue({
      id: "db1",
      teams_meeting_id: "m1",
      subject: "S",
      start_time: null,
      end_time: null,
      organizer_email: null,
      participants: null,
      transcript: null,
      teams_summary: null,
      ai_summary: "resumo",
      action_items: [],
      topics: [],
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      notification_sent_at: null,
      status: "failed",
      last_error: "Falha ao notificar",
      failed_attempts: 1
    } as any);

    vi.mocked(sendMeetingEmail).mockResolvedValue(undefined);
    vi.mocked(postTeamsWebhook).mockResolvedValue(undefined);
    vi.mocked(upsertMeeting).mockResolvedValue({} as any);

    const r = await syncOnce();

    expect(r.processed).toBe(1);
    expect(vi.mocked(sendMeetingEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(postTeamsWebhook)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upsertMeeting)).toHaveBeenCalledWith(
      expect.objectContaining({
        teamsMeetingId: "m1",
        status: "notified",
        notificationSentAt: expect.any(Date)
      })
    );
  });
});

