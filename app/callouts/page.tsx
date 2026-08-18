import Link from "next/link";

import { readCalloutEngineData, type CalloutTokenPerformance, type CallerPerformance, type AutoTradeLedgerTrade } from "@/lib/pumpData";

export const dynamic = "force-dynamic";

function money(value: number | null) {
  if (value == null) return "--";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(6)}`;
}

function fmtTime(value: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function relative(value: string | null) {
  if (!value) return "--";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function pct(value: number | null) {
  if (value == null) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function shortText(value: string | null, fallback = "") {
  if (!value) return fallback;
  return value.length > 26 ? `${value.slice(0, 10)}...${value.slice(-4)}` : value;
}

function TokenToken({ token }: { token: CalloutTokenPerformance }) {
  return (
    <tr>
      <td><strong>{token.symbol ?? `${token.token_mint.slice(0, 4)}...${token.token_mint.slice(-4)}`}</strong><br /><small>{token.name || ""}</small></td>
      <td>{token.signal_count}</td>
      <td>{token.calls}</td>
      <td>{token.executed}</td>
      <td>{token.winRate == null ? "--" : pct(token.winRate)}</td>
      <td>{token.avgPnlPercent == null ? "--" : pct(token.avgPnlPercent)}</td>
      <td>{token.latest_signal_status ?? "--"}</td>
      <td>{token.latest_signal_type ? token.latest_signal_type.replace("_", " ") : "--"}</td>
      <td>{fmtTime(token.lastTradeAt)}</td>
    </tr>
  );
}

function CallerRow({ caller }: { caller: CallerPerformance }) {
  return (
    <tr>
      <td>{shortText(caller.author_username ? `@${caller.author_username}` : caller.author_id, caller.author_id.slice(0, 9))}</td>
      <td>{caller.calls}</td>
      <td>{caller.executed}</td>
      <td>{caller.winRate == null ? "--" : pct(caller.winRate)}</td>
      <td>{caller.avgPnlPercent == null ? "--" : pct(caller.avgPnlPercent)}</td>
      <td>{money(caller.totalSolAllocated)}</td>
      <td>{relative(caller.lastCallAt)}</td>
    </tr>
  );
}

function TradeRow({ trade }: { trade: AutoTradeLedgerTrade }) {
  const symbol = trade.token_symbol || trade.token?.symbol || `${trade.token_mint.slice(0, 4)}...${trade.token_mint.slice(-4)}`;
  return (
    <tr>
      <td>{symbol}</td>
      <td>{trade.author_username ? `@${trade.author_username}` : shortText(trade.author_id, trade.author_id.slice(0, 8))}</td>
      <td>{trade.status}</td>
      <td>{money(trade.sol_amount)}</td>
      <td>{trade.pnl_percent == null ? "--" : pct(trade.pnl_percent)}</td>
      <td>{fmtTime(trade.created_at)}</td>
      <td>{trade.tx_signature ? <a href={`https://solscan.io/tx/${trade.tx_signature}`} target="_blank" rel="noreferrer">tx</a> : "pending"}</td>
    </tr>
  );
}

export default async function CalloutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tokenMint = typeof params?.token === "string" ? params.token.trim() : "";
  const callerId = typeof params?.caller === "string" ? params.caller.trim() : "";
  const engine = await readCalloutEngineData({ tokenMint: tokenMint || undefined, callerId: callerId || undefined, limit: 80 });

  return (
    <main className="docs-shell">
      <section className="docs-hero">
        <p className="docs-breadcrumb">PUMPXBT / CALLOUT SCANNER</p>
        <h1>Signal telemetry, not guesswork.</h1>
        <p>
          Deep-dive into called tokens, verified caller behavior, and realized execution outcomes.
          This is the free analytics layer used by the terminal for scoring and memory.
        </p>
        <p style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/">← Back to terminal</Link>
          {engine.updatedAt ? ` · last refresh ${fmtTime(engine.updatedAt)}` : ""}
        </p>
      </section>

      <section className="panel" style={{ marginTop: "14px" }}>
        <form className="engine-filters" action="/callouts" method="get">
          <input name="token" defaultValue={tokenMint} placeholder="Filter token mint" aria-label="Token mint filter" />
          <input name="caller" defaultValue={callerId} placeholder="Filter caller id" aria-label="Caller filter" />
          <button className="terminal-button" type="submit">Apply</button>
          <a className="outline-btn" href="/callouts">Clear</a>
        </form>

        {!engine.connected ? <p className="empty-cell" style={{ marginTop: "12px" }}>{engine.error || "Unable to load engine telemetry."}</p> : null}
      </section>

      <section className="split-grid" style={{ marginTop: "14px" }}>
        <section className="panel">
          <header className="panel-head">
            <div>
              <span className="eyebrow">01 / TOP CALLOUT TARGETS</span>
              <h2>Token-level performance</h2>
            </div>
            <small>{tokenMint ? `Filtered to ${shortText(tokenMint, "")}` : "Across all observed tokens"}</small>
          </header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Token</th><th>Signals</th><th>Calls</th><th>Executed</th><th>Win%</th><th>Avg%</th><th>Latest Signal</th><th>Signal Type</th><th>Last Call</th>
                </tr>
              </thead>
              <tbody>
                {engine.tokens.length ? engine.tokens.slice(0, 20).map((token) => <TokenToken key={token.token_mint} token={token} />) : (
                  <tr><td colSpan={9} className="empty">No callout telemetry for this filter yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <div>
              <span className="eyebrow">02 / CALLER LEADERBOARD</span>
              <h2>Who ships high-quality calls</h2>
            </div>
            <small>{callerId ? `Filtered to ${shortText(callerId, "")}` : "Across all callers"}</small>
          </header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Caller</th><th>Calls</th><th>Executed</th><th>Win%</th><th>Avg%</th><th>SOL Alloc</th><th>Last Call</th>
                </tr>
              </thead>
              <tbody>
                {engine.callers.length ? engine.callers.slice(0, 20).map((caller) => <CallerRow key={caller.author_id} caller={caller} />) : (
                  <tr><td colSpan={7} className="empty">No caller telemetry yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="panel" style={{ marginTop: "14px" }}>
        <header className="panel-head">
          <div>
            <span className="eyebrow">03 / RECENT TRADES</span>
            <h2>Latest execution rows</h2>
          </div>
          <small>Public, auditable rows pulled from the execution ledger.</small>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Token</th><th>Caller</th><th>Status</th><th>Entry</th><th>PNL</th><th>Time</th><th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {engine.trades.length ? engine.trades.map((trade) => <TradeRow key={trade.id} trade={trade} />) : (
                <tr><td colSpan={7} className="empty">No execution rows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
