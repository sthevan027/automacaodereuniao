import cron from "node-cron";
import { createServer } from "./api/server";
import { getEnv } from "./config/env";
import { syncOnce } from "./jobs/sync";
import { logger } from "./lib/logger";

const env = getEnv();

const { app, port } = createServer();

app.listen(port, () => {
  logger.info("API rodando", { url: `http://localhost:${port}` });
});

cron.schedule(env.SYNC_CRON, async () => {
  try {
    const r = await syncOnce();
    logger.info("Cron sync finalizado", { processed: r.processed, skipped: r.skipped });
  } catch (e) {
    logger.error("Cron sync falhou", { error: (e as any)?.message ?? String(e) });
  }
});

