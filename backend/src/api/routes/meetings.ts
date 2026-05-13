import { Router } from "express";
import { z } from "zod";
import {
  getMeetingById,
  getMeetings,
  MeetingUpdatePatch,
  updateMeetingById
} from "../../db/meetingsRepo";
import { sendMeetingEmail } from "../../notifications/email";
import { postTeamsWebhook } from "../../notifications/teams";

const listQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  company: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

const detailQuerySchema = z.object({
  includeTranscript: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
});

const actionItemSchema = z.object({
  description: z.string(),
  owner: z.string().nullable().optional(),
  deadline: z.string().nullable().optional()
});

const patchBodySchema = z.object({
  action: z.enum(["approve", "reject", "update"]),
  reviewed_by: z.string().max(255).optional(),
  company: z.string().max(255).nullable().optional(),
  ai_summary: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  action_items: z.array(actionItemSchema).optional()
});

export function meetingsRouter() {
  const r = Router();

  r.get("/", async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { q, from, to, company, status, page, pageSize } = parsed.data;
    try {
      const data = await getMeetings({
        q,
        start: from ? new Date(from) : undefined,
        end: to ? new Date(to) : undefined,
        company,
        status,
        page,
        limit: pageSize
      });

      res.json({
        page,
        pageSize,
        total: data.total,
        items: data.rows
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "erro interno" });
    }
  });

  r.patch("/:id", async (req, res) => {
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const id = String(req.params.id);
    const body = parsed.data;
    const existing = await getMeetingById(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    const reviewedBy = body.reviewed_by ?? null;

    if (body.action === "update") {
      const patch: MeetingUpdatePatch = {};
      if (body.company !== undefined) patch.company = body.company;
      if (body.ai_summary !== undefined) patch.ai_summary = body.ai_summary;
      if (body.topics !== undefined) patch.topics = body.topics;
      if (body.action_items !== undefined) patch.action_items = body.action_items;
      const updated = await updateMeetingById(id, patch);
      return res.json(updated);
    }

    if (body.action === "reject") {
      const rejPatch: MeetingUpdatePatch = {
        status: "rejected",
        reviewed_at: new Date(),
        reviewed_by: reviewedBy
      };
      if (body.company !== undefined) rejPatch.company = body.company;
      const updated = await updateMeetingById(id, rejPatch);
      return res.json(updated);
    }

    // approve
    const mergedTopics =
      body.topics !== undefined ? body.topics : (existing.topics as string[] | null) ?? [];
    type AiActionItem = z.infer<typeof actionItemSchema>;
    const mergedActionItems: AiActionItem[] =
      body.action_items !== undefined
        ? body.action_items
        : ((existing.action_items as AiActionItem[] | null) ?? []);

    await updateMeetingById(id, {
      company: body.company !== undefined ? body.company : existing.company ?? null,
      ai_summary:
        body.ai_summary !== undefined ? body.ai_summary : existing.ai_summary ?? null,
      topics: mergedTopics,
      action_items: mergedActionItems,
      reviewed_at: new Date(),
      reviewed_by: reviewedBy,
      status: "approved"
    });

    const saved = await getMeetingById(id);
    if (!saved) return res.status(500).json({ error: "persist_failed" });

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

      const notified = await updateMeetingById(id, {
        status: "notified",
        notification_sent_at: new Date()
      });
      return res.json(notified);
    } catch (e: any) {
      return res.status(502).json({
        error: "notify_failed",
        message: e?.message ?? "erro",
        meeting: saved
      });
    }
  });

  r.get("/:id", async (req, res) => {
    const qParsed = detailQuerySchema.safeParse(req.query);
    if (!qParsed.success) {
      return res.status(400).json({ error: qParsed.error.flatten() });
    }

    const includeTranscript =
      qParsed.data.includeTranscript === "1" || qParsed.data.includeTranscript === "true";

    const id = String(req.params.id);
    try {
      const meeting = await getMeetingById(id);
      if (!meeting) return res.status(404).json({ error: "not_found" });
      if (!includeTranscript) {
        res.json({ ...meeting, transcript: null });
        return;
      }
      res.json(meeting);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "erro interno" });
    }
  });

  return r;
}
