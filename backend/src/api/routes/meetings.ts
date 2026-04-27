import { Router } from "express";
import { z } from "zod";
import { getMeetingById, getMeetings } from "../../db/meetingsRepo";

const listQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

const detailQuerySchema = z.object({
  includeTranscript: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
});

export function meetingsRouter() {
  const r = Router();

  r.get("/", async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { q, from, to, page, pageSize } = parsed.data;
    const data = await getMeetings({
      q,
      start: from ? new Date(from) : undefined,
      end: to ? new Date(to) : undefined,
      page,
      limit: pageSize
    });

    res.json({
      page,
      pageSize,
      total: data.total,
      items: data.rows
    });
  });

  r.get("/:id", async (req, res) => {
    const qParsed = detailQuerySchema.safeParse(req.query);
    if (!qParsed.success) {
      return res.status(400).json({ error: qParsed.error.flatten() });
    }

    const includeTranscript =
      qParsed.data.includeTranscript === "1" || qParsed.data.includeTranscript === "true";

    const id = String(req.params.id);
    const meeting = await getMeetingById(id);
    if (!meeting) return res.status(404).json({ error: "not_found" });
    if (!includeTranscript) {
      res.json({ ...meeting, transcript: null });
      return;
    }
    res.json(meeting);
  });

  return r;
}

