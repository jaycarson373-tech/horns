import Link from "next/link";

import type { CallerPerformance } from "@/lib/pumpData";
import { formatPercent, formatSol, relativeTime, shortAddress } from "@/lib/pumpPresentation";

export function CallerTable({ callers, compact = false }: { callers: CallerPerformance[]; compact?: boolean }) {
  const visible = callers.slice(0, compact ? 7 : 40);
  return (
    <div className="data-table-wrap">
      <table className="data-table caller-table">
        <thead><tr><th>Rank</th><th>Caller</th><th>Calls</th><th>Hit Rate</th><th>Avg Return</th><th>Best Call</th><th>XBT Rank</th></tr></thead>
        <tbody>
          {visible.map((caller, index) => {
            const name = caller.author_username ? `@${caller.author_username}` : shortAddress(caller.author_id);
            const rank = caller.winRate == null ? "UNRANKED" : caller.winRate >= 65 ? "A" : caller.winRate >= 50 ? "B" : "C";
            return <tr key={caller.author_id}><td><strong>#{index + 1}</strong></td><td><Link className="caller-cell" href={`/callers/${encodeURIComponent(caller.author_id)}`}><i>{name.replace("@", "").slice(0, 2).toUpperCase()}</i><span><strong>{name}</strong><small>Active {relativeTime(caller.lastCallAt)} ago</small></span></Link></td><td>{caller.calls}</td><td>{formatPercent(caller.winRate)}</td><td className={(caller.avgPnlPercent ?? 0) >= 0 ? "positive" : "negative"}>{formatPercent(caller.avgPnlPercent)}</td><td>{formatPercent(caller.bestPnlPercent)}</td><td><span className={`rank rank-${rank.toLowerCase()}`}>{rank}</span><small>{formatSol(caller.totalSolAllocated)} tracked</small></td></tr>;
          })}
          {visible.length === 0 ? <tr><td colSpan={7} className="table-empty">CALLER INDEX IS WATCHING — Rankings publish after tracked calls resolve.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
