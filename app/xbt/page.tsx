import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { readCalloutEngineData, readTerminalData } from "@/lib/pumpData";
import { buildXbtReads, relativeTime } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "XBT Analyst | PumpXBT" };

export default async function XbtPage() {
  const [data, engine] = await Promise.all([readTerminalData(), readCalloutEngineData({ limit: 120 })]);
  const reads = buildXbtReads(data, engine);
  return <main className="route-page page-width xbt-page"><div className="route-intro"><SectionHeading eyebrow="PUMPXBT / XBT ANALYST" title="THE INTELLIGENCE ENGINE" description="Market structure, wallet flow, caller performance, liquidity, and momentum in one read." /><div className="route-status"><span><i className={data.connected ? "live" : ""} />XBT ONLINE</span><strong>{data.tokens.length} MARKETS</strong><strong>{data.walletEvents.length} WALLET EVENTS</strong><strong>{engine.trades.length} CALLOUTS</strong></div></div><div className="analyst-layout"><section className="analyst-feed">{reads.map((read, index) => <article key={`${read.label}-${index}`}><aside><span>{String(index + 1).padStart(2, "0")}</span><i /></aside><div><header><span>{read.label}</span><time>{relativeTime(data.updatedAt)} ago</time></header><h2>{read.headline}</h2><p>{read.detail}</p><footer>{read.tokens.map((token) => <Link key={token} href={`/terminal?q=${encodeURIComponent(token.replace("$", ""))}`}>{token}</Link>)}</footer></div></article>)}{reads.length === 0 ? <div className="product-empty">XBT IS WATCHING — The next market read publishes after verified feeds connect.</div> : null}</section><aside className="xbt-method"><span>INPUT STACK</span><ol><li>Pump.fun market data</li><li>Wallet activity</li><li>Caller performance</li><li>Token momentum</li><li>Liquidity + volume</li><li>Callout activity</li></ol><p>Outputs use indexed public data. Missing values stay missing.</p></aside></div></main>;
}
