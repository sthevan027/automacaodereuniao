import express from "express";
import cors from "cors";
import { getEnv } from "../config/env";
import { healthcheckDb } from "../db/connection";
import { meetingsRouter } from "./routes/meetings";
import { syncRouter } from "./routes/sync";

const env = getEnv();

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      await healthcheckDb();
      res.status(200).json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? "erro" });
    }
  });

  app.use("/api/meetings", meetingsRouter());
  app.use("/api/sync", syncRouter());

  app.get("/", (_req, res) => {
    res.status(200).send("Automacao de reuniao API");
  });

  return { app, port: env.PORT };
}

