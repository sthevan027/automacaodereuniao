import cron from "node-cron";
import { createServer } from "./api/server";
import { getEnv } from "./config/env";
import { syncOnce } from "./jobs/sync";

const env = getEnv();

const { app, port } = createServer();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API rodando em http://localhost:${port}`);
});

cron.schedule(env.SYNC_CRON, async () => {
  try {
    const r = await syncOnce();
    // eslint-disable-next-line no-console
    console.log(`Cron sync: processed=${r.processed}, skipped=${r.skipped}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Cron sync falhou", e);
  }
});

