import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { readCalloutEngineData } from "@/lib/pumpData";
import { formatPercent, formatSol, relativeTime, shortAddress } from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";

export default async function CallerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const engine = await readCalloutEngineData({ callerId: decoded, limit: 120 });
  const caller = engine.callers.find((item) => item.author_id === decoded) || engine.callers[0];
  const name = caller?.author_username ? `@${caller.author_username}` : shortAddress(decoded);
  return <main className="route-page page-width"><Link className="back-link" href="/callers">← CALLER LEADERBOARD</Link><SectionHeading eyebrow="PUMPXBT / CALLER PROFILE" title={name} description="Historical calls and recorded execution outcomes." />{caller ? <div className="profile-stats"><article><span>CALLS</span><strong>{caller.calls}</strong></article><article><span>HIT RATE</span><strong>{formatPercent(caller.winRate)}</strong></article><article><span>AVG RETURN</span><strong>{formatPercent(caller.avgPnlPercent)}</strong></article><article><span>BEST CALL</span><strong>{formatPercent(caller.bestPnlPercent)}</strong></article><article><span>TRACKED SIZE</span><strong>{formatSol(caller.totalSolAllocated)}</strong></article><article><span>LAST ACTIVE</span><strong>{relativeTime(caller.lastCallAt)} AGO</strong></article></div> : <div className="product-empty">CALLER MEMORY EMPTY — No resolved call is attached to this identity.</div>}<section className="route-panel"><header><span>RECENT CALLS</span><small>{engine.trades.length} RECORDS</small></header><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Token</th><th>Status</th><th>Entry</th><th>Current PnL</th><th>When</th><th>Proof</th></tr></thead><tbody>{engine.trades.map((trade) => <tr key={trade.id}><td><strong>{trade.token_symbol || trade.token?.symbol || shortAddress(trade.token_mint)}</strong></td><td>{trade.status.toUpperCase()}</td><td>{formatSol(trade.sol_amount)}</td><td className={(trade.pnl_percent ?? 0) >= 0 ? "positive" : "negative"}>{formatPercent(trade.pnl_percent)}</td><td>{relativeTime(trade.created_at)} ago</td><td>{trade.tx_signature ? <a href={`https://solscan.io/tx/${trade.tx_signature}`} target="_blank" rel="noreferrer">TX ↗</a> : "--"}</td></tr>)}{engine.trades.length === 0 ? <tr><td colSpan={6} className="table-empty">CALLER MEMORY EMPTY — XBT is waiting for a resolved call.</td></tr> : null}</tbody></table></div></section></main>;
}
