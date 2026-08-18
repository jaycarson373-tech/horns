import Link from "next/link";

import { ContractAddress } from "@/components/contract-address";
import { MarketTerminal } from "@/components/market-terminal";
import { SectionHeading } from "@/components/section-heading";
import { pumpConfig } from "@/lib/pumpConfig";
import { readCalloutEngineData, readTerminalData } from "@/lib/pumpData";
import { buildMarketRows, formatUsd, relativeTime } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terminal | PumpXBT" };

const TERMINAL_VIEWS = [
  ["LIVE CALLS", "/signals"],
  ["SMART MONEY", "/wallets"],
  ["CALLER PERFORMANCE", "/callers"],
  ["XBT INTELLIGENCE", "/xbt"],
  ["ONCHAIN LEDGER", "/treasury"]
] as const;

export default async function TerminalPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const [data, engine] = await Promise.all([readTerminalData(), readCalloutEngineData({ limit: 120 })]);
  const rows = buildMarketRows(data, engine);
  const totalVolume = rows.reduce((sum, token) => sum + (token.volume_1h_usd ?? 0), 0);
  const tokenMint = pumpConfig.tokenMint || pumpConfig.publicTokenMint;

  return (
    <main className="route-page page-width terminal-page">
      <div className="route-intro">
        <SectionHeading eyebrow="PUMPXBT / TERMINAL" title="THE PUMPXBT TERMINAL" description="Everything XBT sees, in one place." />
        <div className="route-status"><span><i className={data.connected ? "live" : ""} />{data.connected ? "FEED ONLINE" : "FEED DELAYED"}</span><strong>{rows.length} MARKETS</strong><strong>{formatUsd(totalVolume)} 1H VOL</strong><strong>UPDATED {relativeTime(data.updatedAt).toUpperCase()}</strong></div>
      </div>

      <p className="terminal-support">Calls, wallets, caller performance, smart money and real-time Pump.fun intelligence.</p>
      <nav className="terminal-index" aria-label="PumpXBT intelligence views">
        {TERMINAL_VIEWS.map(([label, href]) => <Link href={href} key={href}>{label}<span>↗</span></Link>)}
      </nav>
      {tokenMint ? <ContractAddress mint={tokenMint} pumpFunUrl={pumpConfig.pumpFunTokenUrl} compact /> : null}
      <MarketTerminal rows={rows} initialQuery={query} />
    </main>
  );
}
