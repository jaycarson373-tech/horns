import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";

import { botConfig } from "../lib/botConfig";
import { getConfig } from "../lib/config";
import { runBotOnce } from "../lib/queue";
import { verifyXCredentials } from "../lib/x";

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
  console.info("bot.config", {
    botProjectKey: config.botProjectKey,
    botUsername: config.botUsername,
    botUserId: config.botUserId,
    promptVersion: botConfig.promptVersion,
    dryRun: config.dryRun,
    llmProvider: config.llmProvider,
    pollIntervalMs: config.pollIntervalMs,
    writeAuth: config.xOAuth2UserToken ? "oauth2_user_context" : "oauth1_user_context"
  });

  await verifyXCredentials({ verifyWrite: !config.dryRun });

  do {
    try {
      await runBotOnce("worker");
    } catch (error) {
      console.error(`${config.botProjectKey}.poll.failed`, error);
    }

    if (once || stopping) {
      break;
    }

    await sleep(config.pollIntervalMs);
  } while (!stopping);
}

main().catch((error) => {
  console.error("bot.worker.fatal", error);
  process.exitCode = 1;
});
