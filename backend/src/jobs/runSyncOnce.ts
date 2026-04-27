import { syncOnce } from "./sync";

syncOnce()
  .then((r) => {
    // eslint-disable-next-line no-console
    console.log(`Sync finalizado: processed=${r.processed}, skipped=${r.skipped}`);
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

