import { Router } from "express";
import { z } from "zod";
import { getMeetingById, getMeetings } from "../../db/meetingsRepo";

const listQuerySchema = z.object({
  q: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export function meetingsRouter() {
  const r = Router();

  r.get("/", async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { q, start, end, page, limit } = parsed.data;
    const data = await getMeetings({
      q,
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
      page,
      limit
    });

    res.json({
      page,
      limit,
      total: data.total,
      rows: data.rows
    });
  });

  r.get("/:id", async (req, res) => {
    const id = String(req.params.id);
    const meeting = await getMeetingById(id);
    if (!meeting) return res.status(404).json({ error: "not_found" });
    res.json(meeting);
  });

  return r;
}

