"use client";

import { useMemo, useState } from "react";

import type { TerminalMarketRow } from "@/lib/pumpPresentation";
import { formatPercent, formatUsd, shortAddress } from "@/lib/pumpPresentation";

const TABS = ["Trending", "New", "Smart Money", "Most Called", "XBT Picks"] as const;
type Tab = typeof TABS[number];

function tokenLabel(token: TerminalMarketRow) {
  return token.symbol ? `$${token.symbol.toUpperCase()}` : shortAddress(token.mint);
}

function momentum(token: TerminalMarketRow) {
  const pressure = (token.buys_1h ?? 0) - (token.sells_1h ?? 0);
  if ((token.price_change_1h ?? 0) > 8 && pressure > 0) return "ACCELERATING";
  if ((token.price_change_1h ?? 0) < -8 || pressure < -10) return "FADING";
  return "STEADY";
}

function sortRows(rows: TerminalMarketRow[], tab: Tab) {
  const sorted = [...rows];
  if (tab === "New") return sorted.sort((a, b) => Date.parse(b.pair_created_at ?? "0") - Date.parse(a.pair_created_at ?? "0"));
  if (tab === "Smart Money") return sorted.sort((a, b) => b.smartWallets - a.smartWallets || (b.score ?? 0) - (a.score ?? 0));
  if (tab === "Most Called") return sorted.sort((a, b) => b.callers - a.callers || (b.volume_1h_usd ?? 0) - (a.volume_1h_usd ?? 0));
  if (tab === "XBT Picks") return sorted.filter((token) => (token.score ?? 0) >= 80).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.volume_1h_usd ?? 0) - (a.volume_1h_usd ?? 0));
}

export function MarketTerminal({ rows, initialQuery = "", compact = false }: { rows: TerminalMarketRow[]; initialQuery?: string; compact?: boolean }) {
  const [tab, setTab] = useState<Tab>("Trending");
  const [query, setQuery] = useState(initialQuery);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortRows(rows, tab)
      .filter((token) => !normalized || token.symbol?.toLowerCase().includes(normalized) || token.name?.toLowerCase().includes(normalized) || token.mint.toLowerCase().includes(normalized))
      .slice(0, compact ? 8 : 40);
  }, [compact, query, rows, tab]);

  return (
    <div className="market-terminal">
      <div className="terminal-toolbar">
        <div className="terminal-tabs" role="tablist" aria-label="Market filters">
          {TABS.map((label) => <button key={label} type="button" role="tab" aria-selected={tab === label} onClick={() => setTab(label)}>{label}</button>)}
        </div>
        {!compact ? <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, name, or mint" aria-label="Search market table" /> : null}
      </div>
      <div className="market-table-wrap">
        <table className="market-table">
          <thead><tr><th>Token</th><th>Market Cap</th><th><abbr title="Five-minute change is shown when indexed">5M</abbr></th><th>1H</th><th>Volume</th><th><abbr title="Distinct tracked wallets active in this token">Smart Wallets</abbr></th><th>Callers</th><th><abbr title="PumpXBT composite market quality score from 0 to 100">XBT Score</abbr></th></tr></thead>
          <tbody>
            {visible.map((token) => {
              const target = token.dex_url || `https://solscan.io/token/${token.mint}`;
              return (
                <tr key={token.mint} onClick={() => window.open(target, "_blank", "noopener,noreferrer")} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && window.open(target, "_blank", "noopener,noreferrer")}>
                  <td><span className="token-cell">{token.image_url ? <img src={token.image_url} alt="" /> : <i>{token.symbol?.slice(0, 1) || "•"}</i>}<span><strong>{tokenLabel(token)}</strong><small>{token.name || shortAddress(token.mint)} · {token.updated_at.slice(11, 16)}Z</small></span></span></td>
                  <td>{formatUsd(token.market_cap_usd)}</td>
                  <td className="muted">--</td>
                  <td className={(token.price_change_1h ?? 0) >= 0 ? "positive" : "negative"}>{formatPercent(token.price_change_1h)}</td>
                  <td><strong>{formatUsd(token.volume_1h_usd)}</strong><small className={`momentum ${momentum(token).toLowerCase()}`}>{momentum(token)}</small></td>
                  <td><span className={token.smartWallets ? "smart-count active" : "smart-count"}>{token.smartWallets}</span></td>
                  <td>{token.callers}</td>
                  <td><span className="score-cell"><strong>{token.score?.toFixed(0) ?? "--"}</strong><i style={{ width: `${token.score ?? 0}%` }} /></span></td>
                </tr>
              );
            })}
            {visible.length === 0 ? <tr><td colSpan={8} className="table-empty">XBT IS WATCHING — Waiting for the next verified market snapshot.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
