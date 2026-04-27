import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../db/meetingsRepo", () => ({
  getMeetings: vi.fn(),
  getMeetingById: vi.fn()
}));

vi.mock("../../db/connection", () => ({
  healthcheckDb: vi.fn(async () => undefined)
}));

import { createServer } from "../server";
import { getMeetingById, getMeetings } from "../../db/meetingsRepo";

function authHeader() {
  const u = process.env.BASIC_AUTH_USER ?? "admin";
  const p = process.env.BASIC_AUTH_PASS ?? "changeme";
  const token = Buffer.from(`${u}:${p}`, "utf8").toString("base64");
  return `Basic ${token}`;
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
});

