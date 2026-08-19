import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";

import { botConfig } from "../lib/botConfig";
import { runVerifiedAutoPostOnce } from "../lib/autoPost";
import { getConfig } from "../lib/config";
import { runBotOnce } from "../lib/queue";
import { verifySupabaseSchema } from "../lib/supabase";
import { verifyXCredentials } from "../lib/x";
import { syncTradeWalletOnce } from "../lib/tradeWalletSync";

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
    autoTradeEnabled: config.autoTradeEnabled,
    autoTradeReady: config.autoTradeEnabled && !config.autoTradeUnavailableReason,
    autoTradeUnavailableReason: config.autoTradeUnavailableReason,
    tradeWalletSyncEnabled: config.tradeWalletSyncEnabled,
    xAutoPostEnabled: config.xAutoPostEnabled,
    writeAuth: config.xOAuth2UserToken ? "oauth2_user_context" : "oauth1_user_context"
  });
  if (config.autoTradeUnavailableReason) {
    console.warn("bot.auto_trade.unavailable", { reason: config.autoTradeUnavailableReason });
  }

  await verifyXCredentials({ verifyWrite: !config.dryRun });
  await verifySupabaseSchema();

  do {
    try {
      await runBotOnce("worker");
      try {
        await syncTradeWalletOnce();
      } catch (error) {
        console.error("pumpxbt.trade_wallet.sync_failed", error);
      }
      await runVerifiedAutoPostOnce();
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
