"use client";

import { useMemo, useState } from "react";

import type { PumpSignal } from "@/lib/pumpData";
import { formatUsd, relativeTime, shortAddress, signalCategory } from "@/lib/pumpPresentation";

const FILTERS = ["All", "High Confidence", "Smart Money", "Caller Convergence", "Momentum", "Risk"] as const;

export function SignalBoard({ signals, limit }: { signals: PumpSignal[]; limit?: number }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const visible = useMemo(() => signals.filter((signal) => filter === "All" || signalCategory(signal) === filter).slice(0, limit ?? signals.length), [filter, limit, signals]);

  return (
    <div className="signal-board">
      <div className="filter-strip" role="tablist" aria-label="Signal filters">
        {FILTERS.map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="xbt-signal-grid">
        {visible.map((signal) => {
          const symbol = signal.token?.symbol ? `$${signal.token.symbol.toUpperCase()}` : shortAddress(signal.token_mint);
          return (
            <article className="xbt-signal" key={signal.id}>
              <header><span>XBT SIGNAL</span><time suppressHydrationWarning>{relativeTime(signal.published_at || signal.created_at)} ago</time></header>
              <div className="signal-title"><div><small>{signalCategory(signal)}</small><h3>{symbol}</h3></div><strong>{signal.confidence}<small>XBT SCORE</small></strong></div>
              <p>{signal.thesis}</p>
              <footer><span>{signal.token?.price_usd == null ? "PRICE --" : `PRICE ${formatUsd(signal.token.price_usd)}`}</span><span>{signal.status.toUpperCase()}</span>{signal.token?.dex_url ? <a href={signal.token.dex_url} target="_blank" rel="noreferrer">MARKET ↗</a> : null}</footer>
            </article>
          );
        })}
        {visible.length === 0 ? <div className="product-empty">NO HIGH-CONVICTION CALLS — XBT is still scanning.</div> : null}
      </div>
    </div>
  );
}
