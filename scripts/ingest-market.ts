import "dotenv/config";

import { runMarketIngest } from "../lib/marketIngest";

runMarketIngest()
  .then((result) => console.info(JSON.stringify({ event: "pumpxbt.ingest.complete", ...result })))
  .catch((error) => {
    console.error("pumpxbt.ingest.failed", error);
    process.exitCode = 1;
  });
