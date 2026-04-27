import cron from "node-cron";
import { createServer } from "./api/server";
import { getEnv } from "./config/env";
import { syncOnce } from "./jobs/sync";

const env = getEnv();

const { app, port } = createServer();

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

cron.schedule(env.SYNC_CRON, async () => {
  try {
    const r = await syncOnce();
    console.log(`Cron sync: processed=${r.processed}, skipped=${r.skipped}`);
  } catch (e) {
    console.error("Cron sync falhou", e);
  }
});

