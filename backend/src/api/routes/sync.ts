import { Router } from "express";
import { syncOnce } from "../../jobs/sync";

export function syncRouter() {
  const r = Router();

  r.post("/", async (_req, res) => {
    const startedAt = new Date();
    try {
      const result = await syncOnce();
      res.status(200).json({
        startedAt: startedAt.toISOString(),
        processedCount: result.processed,
        skippedCount: result.skipped
      });
    } catch (e: any) {
      res.status(500).json({
        startedAt: startedAt.toISOString(),
        error: e?.message ?? "erro"
      });
    }
  });

  return r;
}

