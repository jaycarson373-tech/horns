import { MarketTerminal } from "@/components/market-terminal";
import { SectionHeading } from "@/components/section-heading";
import { readCalloutEngineData, readTerminalData } from "@/lib/pumpData";
import { buildMarketRows, formatUsd, relativeTime } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terminal | PumpXBT" };

export default async function TerminalPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const [data, engine] = await Promise.all([readTerminalData(), readCalloutEngineData({ limit: 120 })]);
  const rows = buildMarketRows(data, engine);
  const totalVolume = rows.reduce((sum, token) => sum + (token.volume_1h_usd ?? 0), 0);
  return <main className="route-page page-width"><div className="route-intro"><SectionHeading eyebrow="PUMPXBT / TERMINAL" title="LIVE PUMP.FUN MARKET TAPE" description="Ranked by market quality, smart-wallet activity, caller convergence, and momentum." /><div className="route-status"><span><i className={data.connected ? "live" : ""} />{data.connected ? "FEED ONLINE" : "FEED DELAYED"}</span><strong>{rows.length} MARKETS</strong><strong>{formatUsd(totalVolume)} 1H VOL</strong><strong>UPDATED {relativeTime(data.updatedAt).toUpperCase()}</strong></div></div><MarketTerminal rows={rows} initialQuery={query} /></main>;
}
