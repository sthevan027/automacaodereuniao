import express from "express";
import cors from "cors";
import { getEnv } from "../config/env";
import { healthcheckDb } from "../db/connection";
import { meetingsRouter } from "./routes/meetings";
import { syncRouter } from "./routes/sync";
import { basicAuth } from "./middleware/basicAuth";

const env = getEnv();

export function createServer() {
  const app = express();
  app.use(
    cors(
      env.FRONTEND_ORIGIN
        ? {
            origin: env.FRONTEND_ORIGIN,
            methods: ["GET", "POST", "PATCH", "OPTIONS"],
            allowedHeaders: ["Authorization", "Content-Type"]
          }
        : undefined
    )
  );
  app.use(express.json({ limit: "5mb" }));

  const auth = basicAuth({
    user: env.BASIC_AUTH_USER,
    pass: env.BASIC_AUTH_PASS,
    realm: "AutomacaoDeReuniao"
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await healthcheckDb();
      res.status(200).json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? "erro" });
    }
  });

  app.use("/api/meetings", auth, meetingsRouter());
  app.use("/api/sync", auth, syncRouter());

  app.get("/", (_req, res) => {
    res.status(200).send("Automacao de reuniao API");
  });

  return { app, port: env.PORT };
}

