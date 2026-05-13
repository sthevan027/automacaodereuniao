import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../db/meetingsRepo", () => ({
  getMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeetingById: vi.fn()
}));

vi.mock("../../db/connection", () => ({
  healthcheckDb: vi.fn(async () => undefined)
}));

vi.mock("../../notifications/email", () => ({
  sendMeetingEmail: vi.fn()
}));

vi.mock("../../notifications/teams", () => ({
  postTeamsWebhook: vi.fn()
}));

import { createServer } from "../server";
import { getMeetingById, getMeetings, updateMeetingById } from "../../db/meetingsRepo";
import { sendMeetingEmail } from "../../notifications/email";
import { postTeamsWebhook } from "../../notifications/teams";

function authHeader() {
  const u = process.env.BASIC_AUTH_USER ?? "admin";
  const p = process.env.BASIC_AUTH_PASS ?? "changeme";
  const token = Buffer.from(`${u}:${p}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function makeMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: "meeting-uuid-1",
    teams_meeting_id: "t1",
    subject: "Reunião de Alinhamento",
    start_time: "2026-05-01T10:00:00Z",
    end_time: "2026-05-01T11:00:00Z",
    organizer_email: "org@example.com",
    participants: [],
    transcript: "transcrição secreta",
    teams_summary: "resumo teams",
    ai_summary: "resumo ia",
    action_items: [{ description: "Fazer algo", owner: "Alguém", deadline: null }],
    topics: ["Automação", "Teams"],
    created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
    notification_sent_at: null,
    status: "pending_review",
    last_error: null,
    failed_attempts: 0,
    company: "Vesper Bio",
    reviewed_at: null,
    reviewed_by: null,
    ...overrides
  };
}

describe("GET /api/meetings", () => {
  beforeEach(() => {
    vi.mocked(getMeetings).mockReset();
  });

  it("exige basic auth", async () => {
    const { app } = createServer();
    const res = await request(app).get("/api/meetings");
    expect(res.status).toBe(401);
  });

  it("retorna items/page/pageSize/total", async () => {
    vi.mocked(getMeetings).mockResolvedValue({
      total: 1,
      rows: [
        {
          id: "1",
          teams_meeting_id: "t1",
          subject: "Assunto",
          start_time: null,
          end_time: null,
          organizer_email: null,
          participants: null,
          transcript: null,
          teams_summary: null,
          ai_summary: "Resumo",
          action_items: [],
          topics: [],
          created_at: new Date().toISOString(),
          processed_at: null,
          notification_sent_at: null
        }
      ]
    });

    const { app } = createServer();
    const res = await request(app)
      .get("/api/meetings?from=2026-01-01&to=2026-01-31&page=1&pageSize=20")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(20);
  });
});

describe("GET /api/meetings/:id", () => {
  beforeEach(() => {
    vi.mocked(getMeetingById).mockReset();
  });

  it("omite transcript por padrão", async () => {
    vi.mocked(getMeetingById).mockResolvedValue({
      id: "1",
      teams_meeting_id: "t1",
      subject: "Assunto",
      start_time: null,
      end_time: null,
      organizer_email: null,
      participants: [],
      transcript: "segredo",
      teams_summary: null,
      ai_summary: "Resumo",
      action_items: [],
      topics: [],
      created_at: new Date().toISOString(),
      processed_at: null,
      notification_sent_at: null
    });

    const { app } = createServer();
    const res = await request(app)
      .get("/api/meetings/1")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBeNull();
  });

  it("inclui transcript quando includeTranscript=1", async () => {
    vi.mocked(getMeetingById).mockResolvedValue({
      id: "1",
      teams_meeting_id: "t1",
      subject: "Assunto",
      start_time: null,
      end_time: null,
      organizer_email: null,
      participants: [],
      transcript: "segredo",
      teams_summary: null,
      ai_summary: "Resumo",
      action_items: [],
      topics: [],
      created_at: new Date().toISOString(),
      processed_at: null,
      notification_sent_at: null
    });

    const { app } = createServer();
    const res = await request(app)
      .get("/api/meetings/1?includeTranscript=1")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe("segredo");
  });

  it("retorna 404 para ID inexistente", async () => {
    vi.mocked(getMeetingById).mockResolvedValue(null);

    const { app } = createServer();
    const res = await request(app)
      .get("/api/meetings/nao-existe")
      .set("Authorization", authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });
});

describe("PATCH /api/meetings/:id", () => {
  beforeEach(() => {
    vi.mocked(getMeetingById).mockReset();
    vi.mocked(updateMeetingById).mockReset();
    vi.mocked(sendMeetingEmail).mockReset();
    vi.mocked(postTeamsWebhook).mockReset();
  });

  it("retorna 400 com body inválido", async () => {
    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/any-id")
      .set("Authorization", authHeader())
      .send({ action: "invalid_action" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("retorna 404 quando reunião não existe", async () => {
    vi.mocked(getMeetingById).mockResolvedValue(null);

    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/nao-existe")
      .set("Authorization", authHeader())
      .send({ action: "update", ai_summary: "novo resumo" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("action:update salva rascunho sem alterar status", async () => {
    const meeting = makeMeeting();
    vi.mocked(getMeetingById).mockResolvedValue(meeting as any);
    const updated = { ...meeting, ai_summary: "resumo editado", company: "Nova Empresa" };
    vi.mocked(updateMeetingById).mockResolvedValue(updated as any);

    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/meeting-uuid-1")
      .set("Authorization", authHeader())
      .send({
        action: "update",
        ai_summary: "resumo editado",
        company: "Nova Empresa",
        topics: ["Tópico A"],
        action_items: [{ description: "Tarefa X", owner: null, deadline: null }]
      });

    expect(res.status).toBe(200);
    expect(vi.mocked(updateMeetingById)).toHaveBeenCalledWith(
      "meeting-uuid-1",
      expect.objectContaining({
        ai_summary: "resumo editado",
        company: "Nova Empresa",
        topics: ["Tópico A"]
      })
    );
    // não deve chamar email/webhook
    expect(vi.mocked(sendMeetingEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(postTeamsWebhook)).not.toHaveBeenCalled();
  });

  it("action:reject define status rejected e reviewed_by", async () => {
    const meeting = makeMeeting();
    vi.mocked(getMeetingById).mockResolvedValue(meeting as any);
    const rejected = { ...meeting, status: "rejected", reviewed_by: "Sthevan" };
    vi.mocked(updateMeetingById).mockResolvedValue(rejected as any);

    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/meeting-uuid-1")
      .set("Authorization", authHeader())
      .send({ action: "reject", reviewed_by: "Sthevan" });

    expect(res.status).toBe(200);
    expect(vi.mocked(updateMeetingById)).toHaveBeenCalledWith(
      "meeting-uuid-1",
      expect.objectContaining({
        status: "rejected",
        reviewed_by: "Sthevan"
      })
    );
    expect(vi.mocked(sendMeetingEmail)).not.toHaveBeenCalled();
  });

  it("action:approve envia notificações e retorna status notified", async () => {
    const meeting = makeMeeting();
    vi.mocked(getMeetingById)
      .mockResolvedValueOnce(meeting as any) // busca inicial
      .mockResolvedValueOnce({ ...meeting, status: "approved" } as any); // após updateMeetingById
    vi.mocked(updateMeetingById).mockResolvedValue({ ...meeting, status: "notified" } as any);
    vi.mocked(sendMeetingEmail).mockResolvedValue(undefined);
    vi.mocked(postTeamsWebhook).mockResolvedValue(undefined);

    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/meeting-uuid-1")
      .set("Authorization", authHeader())
      .send({
        action: "approve",
        reviewed_by: "Sthevan",
        company: "Vesper Bio",
        ai_summary: "resumo aprovado",
        topics: ["Automação"],
        action_items: []
      });

    expect(res.status).toBe(200);
    expect(vi.mocked(sendMeetingEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(postTeamsWebhook)).toHaveBeenCalledTimes(1);
    // última chamada de updateMeetingById marca como notified
    expect(vi.mocked(updateMeetingById)).toHaveBeenLastCalledWith(
      "meeting-uuid-1",
      expect.objectContaining({ status: "notified" })
    );
  });

  it("action:approve retorna 502 quando notificação falha, mas meeting está no body", async () => {
    const meeting = makeMeeting();
    vi.mocked(getMeetingById)
      .mockResolvedValueOnce(meeting as any)
      .mockResolvedValueOnce({ ...meeting, status: "approved" } as any);
    vi.mocked(updateMeetingById).mockResolvedValue({ ...meeting, status: "approved" } as any);
    vi.mocked(sendMeetingEmail).mockRejectedValue(new Error("SMTP timeout"));

    const { app } = createServer();
    const res = await request(app)
      .patch("/api/meetings/meeting-uuid-1")
      .set("Authorization", authHeader())
      .send({ action: "approve", reviewed_by: "Sthevan", ai_summary: "x", topics: [], action_items: [] });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("notify_failed");
    expect(res.body.message).toContain("SMTP timeout");
    expect(res.body.meeting).toBeDefined();
    expect(res.body.meeting.id).toBe("meeting-uuid-1");
  });
});
