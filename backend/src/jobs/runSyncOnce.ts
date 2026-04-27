import { syncOnce } from "./sync";

syncOnce()
  .then((r) => {
    console.log(`Sync finalizado: processed=${r.processed}, skipped=${r.skipped}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

