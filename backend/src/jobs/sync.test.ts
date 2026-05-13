import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../graph/meetings", () => ({
  listRecentOnlineMeetings: vi.fn(),
  getLatestTranscriptText: vi.fn(),
  getCopilotMeetingNotes: vi.fn()
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

import { listRecentOnlineMeetings, getLatestTranscriptText, getCopilotMeetingNotes } from "../graph/meetings";
import { findMeetingByTeamsId, markMeetingFailed, upsertMeeting } from "../db/meetingsRepo";
import { sendMeetingEmail } from "../notifications/email";
import { postTeamsWebhook } from "../notifications/teams";
import { syncOnce } from "./sync";

function makeMeetingGraph(id = "m1") {
  return {
    id,
    subject: "Reunião Teste",
    startDateTime: new Date().toISOString(),
    endDateTime: null,
    organizer: null,
    participants: { attendees: [] }
  } as any;
}

function makeDbMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: "db1",
    teams_meeting_id: "m1",
    subject: "Reunião Teste",
    start_time: new Date().toISOString(),
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
    status: null,
    last_error: null,
    failed_attempts: 0,
    ...overrides
  };
}

describe("syncOnce", () => {
  beforeEach(() => {
    vi.mocked(listRecentOnlineMeetings).mockReset();
    vi.mocked(findMeetingByTeamsId).mockReset();
    vi.mocked(upsertMeeting).mockReset();
    vi.mocked(markMeetingFailed).mockReset();
    vi.mocked(sendMeetingEmail).mockReset();
    vi.mocked(postTeamsWebhook).mockReset();
    vi.mocked(getLatestTranscriptText).mockReset();
    vi.mocked(getCopilotMeetingNotes).mockReset();
  });

  it("lista vazia retorna processed:0 skipped:0", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([]);

    const r = await syncOnce();

    expect(r.processed).toBe(0);
    expect(r.skipped).toBe(0);
    expect(vi.mocked(upsertMeeting)).not.toHaveBeenCalled();
  });

  it("skip reunião com status notified", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({ status: "notified", notification_sent_at: new Date().toISOString() }) as any
    );

    const r = await syncOnce();

    expect(r.skipped).toBe(1);
    expect(r.processed).toBe(0);
    expect(vi.mocked(upsertMeeting)).not.toHaveBeenCalled();
  });

  it("skip reunião com notification_sent_at preenchido (mesmo sem status notified)", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({ status: "approved", notification_sent_at: new Date().toISOString() }) as any
    );

    const r = await syncOnce();

    expect(r.skipped).toBe(1);
  });

  it("skip reunião com status pending_review", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({ status: "pending_review", processed_at: new Date().toISOString() }) as any
    );

    const r = await syncOnce();

    expect(r.skipped).toBe(1);
    expect(vi.mocked(upsertMeeting)).not.toHaveBeenCalled();
  });

  it("skip reunião com status rejected", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({ status: "rejected", processed_at: new Date().toISOString() }) as any
    );

    const r = await syncOnce();

    expect(r.skipped).toBe(1);
  });

  it("não reprocessa quando failed_attempts >= 3", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({ status: "failed", failed_attempts: 3, last_error: "boom" }) as any
    );

    const r = await syncOnce();
    expect(r.skipped).toBe(1);
    expect(r.processed).toBe(0);
    expect(vi.mocked(upsertMeeting)).not.toHaveBeenCalled();
  });

  it("captura reunião nova e salva com status pending_review", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(null);
    vi.mocked(upsertMeeting).mockResolvedValue({} as any);
    vi.mocked(getLatestTranscriptText).mockResolvedValue("transcrição da reunião");
    vi.mocked(getCopilotMeetingNotes).mockResolvedValue("notas do copilot");

    const r = await syncOnce();

    expect(r.processed).toBe(1);
    // primeiro upsert: captura inicial
    expect(vi.mocked(upsertMeeting)).toHaveBeenCalledWith(
      expect.objectContaining({ teamsMeetingId: "m1", status: "captured" })
    );
    // segundo upsert: após obter transcript/notas
    expect(vi.mocked(upsertMeeting)).toHaveBeenCalledWith(
      expect.objectContaining({ teamsMeetingId: "m1", status: "pending_review" })
    );
    // não deve enviar notificações
    expect(vi.mocked(sendMeetingEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(postTeamsWebhook)).not.toHaveBeenCalled();
  });

  it("tenta reenviar notificação quando status failed ainda sem notificação (abaixo do limite)", async () => {
    vi.mocked(listRecentOnlineMeetings).mockResolvedValue([makeMeetingGraph()]);
    vi.mocked(findMeetingByTeamsId).mockResolvedValue(
      makeDbMeeting({
        status: "failed",
        last_error: "Falha ao notificar",
        failed_attempts: 1,
        processed_at: new Date().toISOString(),
        ai_summary: "resumo",
        action_items: [],
        topics: []
      }) as any
    );
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
