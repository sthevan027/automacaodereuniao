import { Router } from "express";
import { syncOnce } from "../../jobs/sync";

export function syncRouter() {
  const r = Router();

  r.post("/", async (_req, res) => {
    try {
      const result = await syncOnce();
      res.status(200).json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? "erro" });
    }
  });

  return r;
}

