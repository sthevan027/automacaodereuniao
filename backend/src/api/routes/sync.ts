import { Router } from "express";
import { syncOnce } from "../../jobs/sync";

let syncRunning = false;

export function syncRouter() {
  const r = Router();

  r.post("/", async (_req, res) => {
    if (syncRunning) {
      return res.status(409).json({ error: "sync_already_running" });
    }

    const startedAt = new Date();
    syncRunning = true;
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
    } finally {
      syncRunning = false;
    }
  });

  return r;
}

