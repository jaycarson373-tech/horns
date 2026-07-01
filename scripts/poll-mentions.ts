import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";

import { getConfig } from "../lib/config";
import { runBotOnce } from "../lib/queue";

let stopping = false;

function requestStop(signal: string) {
  console.info(`Received ${signal}; stopping after current poll`);
  stopping = true;
}

process.on("SIGINT", () => requestStop("SIGINT"));
process.on("SIGTERM", () => requestStop("SIGTERM"));

async function main() {
  const once = process.argv.includes("--once");
  const config = getConfig();

  do {
    try {
      await runBotOnce("worker");
    } catch (error) {
      console.error("catify.poll.failed", error);
    }

    if (once || stopping) {
      break;
    }

    await sleep(config.pollIntervalMs);
  } while (!stopping);
}

main().catch((error) => {
  console.error("catify.worker.fatal", error);
  process.exitCode = 1;
});
