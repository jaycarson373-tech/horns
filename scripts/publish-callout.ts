import "dotenv/config";

import { getConfig } from "../lib/config";
import { queuePumpToken } from "../lib/pumpData";
import { getSupabase } from "../lib/supabase";

async function main() {
  const [mint, thesis, confidenceText = "75"] = process.argv.slice(2);
  const confidence = Number.parseInt(confidenceText, 10);
  if (!mint || !thesis || !Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    throw new Error('Usage: npm run callout -- <mint> "<short thesis>" [confidence 0-100]');
  }

  const config = getConfig();
  await queuePumpToken(mint);
  const publishedAt = new Date().toISOString();
  const { data, error } = await getSupabase().from("pump_signals").insert({
    token_mint: mint,
    signal_type: confidence >= 85 ? "high_conviction" : "watch",
    status: "active",
    thesis: thesis.slice(0, 500),
    confidence,
    is_premium: false,
    approved_by: `manual:${config.botUsername}`,
    published_at: publishedAt
  }).select("id,token_mint,signal_type,status,confidence,published_at").single();
  if (error) throw error;
  console.info(JSON.stringify({ event: "pumpxbt.manual_callout.published", signal: data }));
}

main().catch((error) => {
  console.error("pumpxbt.manual_callout.failed", error);
  process.exitCode = 1;
});
