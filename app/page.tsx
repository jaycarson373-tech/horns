import Link from "next/link";

import { TokenActions } from "@/components/token-actions";
import { pumpConfig } from "@/lib/pumpConfig";
import { readTerminalData, type PumpSignal, type TreasuryEvent } from "@/lib/pumpData";
import { formatSol, formatUsd, relativeTime, shortAddress, signalCategory } from "@/lib/pumpPresentation";
import { readProjectMetrics } from "@/lib/projectMetrics";

export const dynamic = "force-dynamic";

const SYSTEM_STEPS = ["SCAN", "SIGNAL", "CALL", "PROFIT", "BUYBACK & BURN"] as const;
const REWARD_STEPS = ["MAKE A CALL", "PERFORMANCE TRACKED", "PROVE YOUR EDGE", "EARN"] as const;
const AGENT_FUNCTIONS = [
  ["WATCHES", "Pump.fun markets, launches, wallets, and callers."],
  ["THINKS", "Connects market structure, momentum, caller performance, and onchain flow."],
  ["CALLS", "Surfaces the strongest opportunities instead of every new launch."],
  ["LEARNS", "Records outcomes so the intelligence layer can improve over time."],
  ["COMPOUNDS", "Verified strategy profits feed the buyback-and-burn flywheel."]
] as const;

function signalName(signal: PumpSignal) {
  return signal.token?.symbol ? `$${signal.token.symbol.toUpperCase()}` : shortAddress(signal.token_mint);
}

function LiveCall({ signal }: { signal: PumpSignal }) {
  return (
    <article className="home-call-card">
      <header>
        <span>XBT CALL</span>
        <time suppressHydrationWarning>{relativeTime(signal.published_at || signal.created_at)} AGO</time>
      </header>
      <div className="home-call-title">
        <div><small>{signalCategory(signal).toUpperCase()}</small><h3>{signalName(signal)}</h3></div>
        <strong>{signal.confidence}<small>XBT SCORE</small></strong>
      </div>
      <p>{signal.thesis}</p>
      <footer>
        <span>STATUS / {signal.status.toUpperCase()}</span>
        <span>{signal.token?.price_usd == null ? "PRICE / --" : `PRICE / ${formatUsd(signal.token.price_usd)}`}</span>
        {signal.token?.dex_url ? <a href={signal.token.dex_url} target="_blank" rel="noreferrer">MARKET ↗</a> : null}
      </footer>
    </article>
  );
}

function sumVerifiedTokenEvents(events: TreasuryEvent[], eventType: TreasuryEvent["event_type"], tokenMint: string) {
  const matches = events.filter((event) => event.event_type === eventType && event.token_mint === tokenMint);
  if (!matches.length) return null;
  return matches.reduce((sum, event) => sum + event.amount, 0);
}

function formatTokenAmount(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default async function HomePage() {
  const [data, projectMetrics] = await Promise.all([readTerminalData(), readProjectMetrics()]);
  const botHandle = pumpConfig.botHandle;
  const tokenMint = pumpConfig.tokenMint || pumpConfig.publicTokenMint;
  const buyUrl = process.env.NEXT_PUBLIC_BUY_URL?.trim()
    || (tokenMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${encodeURIComponent(tokenMint)}` : "");
  const liveSignals = data.signals.slice(0, 3);
  const executedTrades = data.autoTrades.filter((trade) => trade.status === "executed");
  const realizedProfitEvents = data.treasuryEvents.filter((event) => event.event_type === "trade_profit");
  const realizedProfitUsd = realizedProfitEvents.length > 0 && realizedProfitEvents.every((event) => event.amount_usd != null)
    ? realizedProfitEvents.reduce((sum, event) => sum + (event.amount_usd ?? 0), 0)
    : null;
  const boughtBack = tokenMint ? sumVerifiedTokenEvents(data.treasuryEvents, "buyback", tokenMint) : null;
  const burned = tokenMint ? sumVerifiedTokenEvents(data.treasuryEvents, "burn", tokenMint) : null;
  const hasVerifiedFlywheelData = realizedProfitUsd != null || boughtBack != null || burned != null;

  return (
    <main className="home-page">
      <section className="home-hero page-width" id="agent">
        <div className="home-hero-copy">
          <span className="protocol-label"><i className={data.connected ? "live" : ""} />PUMPXBT / PUMP.FUN INTELLIGENCE AGENT</span>
          <h1>PUMP<span>XBT</span></h1>
          <h2>THE INTELLIGENCE AGENT FOR PUMP.FUN</h2>
          <p>XBT watches launches, wallets, callers, and market flow. It publishes high-quality calls, tracks every outcome, and gets sharper over time.</p>
          <div className="button-row">
            {botHandle ? <a className="primary-button" href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">FOLLOW XBT ON X</a> : <Link className="primary-button" href="/xbt">MEET XBT</Link>}
            <Link className="secondary-button" href="/signals">VIEW LIVE CALLS</Link>
          </div>
        </div>
      </section>

      <section className="home-live-metrics" aria-label="Verified PumpXBT metrics">
        <div className="page-width">
          <article><span>$PUMPXBT PRICE</span><strong>{formatUsd(projectMetrics.priceUsd ?? data.projectToken?.price_usd ?? null)}</strong><small>DEX MARKET</small></article>
          <article><span>CREATOR / TRADING WALLET</span><strong>{formatSol(projectMetrics.creatorWalletSol)}</strong>{projectMetrics.creatorWallet ? <a href={`https://solscan.io/account/${projectMetrics.creatorWallet}`} target="_blank" rel="noreferrer">{shortAddress(projectMetrics.creatorWallet)} ↗</a> : <small>ADD WALLET IN VERCEL</small>}</article>
          <article><span>VERIFIED REALIZED PROFIT</span><strong>{formatUsd(realizedProfitUsd)}</strong><small>TREASURY LEDGER</small></article>
          <article><span>TOTAL $PUMPXBT BUYBACKS</span><strong>{boughtBack == null ? "--" : formatTokenAmount(boughtBack)}</strong><small>CONFIRMED EVENTS</small></article>
        </div>
      </section>

      <section className="home-band system-section">
        <div className="page-width">
          <span className="section-index">01 / THE SYSTEM</span>
          <h2>THE AGENT WATCHES. THE FLYWHEEL COMPOUNDS.</h2>
          <div className="system-flow" aria-label="Scan to buyback and burn system flow">
            {SYSTEM_STEPS.map((step, index) => <div className="flow-step" key={step}><b>{String(index + 1).padStart(2, "0")}</b><strong>{step}</strong>{index < SYSTEM_STEPS.length - 1 ? <span aria-hidden>→</span> : null}</div>)}
          </div>
          <div className="system-copy">
            <p>PumpXBT continuously scans Pump.fun for high-quality setups.</p>
            <p>The strongest opportunities become calls.</p>
            <p>Successful strategy performance can feed $PUMPXBT buybacks and burns.</p>
          </div>
          <div className="agent-functions" aria-label="XBT agent functions">
            {AGENT_FUNCTIONS.map(([label, copy], index) => <div key={label}><b>{String(index + 1).padStart(2, "0")}</b><strong>{label}</strong><span>{copy}</span></div>)}
          </div>
        </div>
      </section>

      <section className="home-band calls-section">
        <div className="page-width home-split-heading">
          <div><span className="section-index">02 / XBT CALLS</span><h2>HIGH-QUALITY CALLS.<br />NOT MORE NOISE.</h2></div>
          <p>PumpXBT analyzes the Pump.fun market in real time to surface opportunities backed by multiple signals rather than blindly calling every launch.</p>
        </div>
        <div className="page-width home-call-grid">
          {liveSignals.map((signal) => <LiveCall signal={signal} key={signal.id} />)}
          {liveSignals.length === 0 ? <div className="home-honest-empty"><strong>NO VERIFIED CALLS LIVE.</strong><span>The feed stays empty until an approved signal clears the system.</span></div> : null}
        </div>
        <div className="page-width section-action"><Link href="/signals">VIEW ALL CALLS →</Link></div>
      </section>

      <section className="home-band rewards-section">
        <div className="page-width">
          <div className="home-split-heading">
            <div><span className="section-index">03 / CALLER REPUTATION</span><h2>GOOD CALLS SHOULD GET PAID.</h2></div>
            <div className="section-copy"><p>PumpXBT records calls and their actual outcomes. Strong callers rise by the quality of their calls, not follower count or reach.</p><small>CALLER REWARD DISTRIBUTION / IN DEVELOPMENT</small></div>
          </div>
          <div className="reward-flow">
            {REWARD_STEPS.map((step, index) => <div key={step}><b>{String(index + 1).padStart(2, "0")}</b><strong>{step}</strong></div>)}
          </div>
          <div className="section-action"><Link href="/callers">VIEW CALLERS →</Link></div>
        </div>
      </section>

      <section className="home-band execution-section">
        <div className="page-width execution-layout">
          <div><span className="section-index">04 / EXECUTION</span><h2>INTELLIGENCE WITH<br />SKIN IN THE GAME.</h2><p>PumpXBT includes an execution layer that can take positions from qualified callouts. Realized strategy profits can then enter the PumpXBT flywheel.</p></div>
          <div className="execution-rail">
            <header><span>XBT / EXECUTION ENGINE</span><strong>{executedTrades.length > 0 ? "VERIFIED ACTIVITY" : "CONFIGURABLE"}</strong></header>
            <div><span>INTELLIGENCE</span><i /><span>POSITION</span><i /><span>REALIZED PROFIT</span></div>
            <footer>{executedTrades.length > 0 ? `${executedTrades.length} verified execution record${executedTrades.length === 1 ? "" : "s"} in the current ledger view.` : "No execution performance is displayed until a transaction is verified."}</footer>
          </div>
        </div>
      </section>

      <section className="home-band burn-section">
        <div className="page-width">
          <span className="section-index">05 / BUYBACK & BURN</span>
          <h2>THE BETTER XBT GETS,<br />THE STRONGER THE FLYWHEEL.</h2>
          <div className="burn-stack"><strong>HIGH-QUALITY CALLS</strong><span>↓</span><strong>REALIZED PROFITS</strong><span>↓</span><strong>$PUMPXBT BUYBACKS</strong><span>↓</span><strong>BURN</strong></div>
          <p className="burn-support">Profits generated by the PumpXBT strategy are used to buy back and burn $PUMPXBT.</p>
          {hasVerifiedFlywheelData ? <div className="verified-flywheel-data">
            {realizedProfitUsd != null ? <article><span>VERIFIED REALIZED PROFIT</span><strong>{formatUsd(realizedProfitUsd)}</strong></article> : null}
            {boughtBack != null ? <article><span>$PUMPXBT BOUGHT BACK</span><strong>{formatTokenAmount(boughtBack)}</strong></article> : null}
            {burned != null ? <article><span>$PUMPXBT BURNED</span><strong>{formatTokenAmount(burned)}</strong></article> : null}
          </div> : <div className="flywheel-proof-empty">Verified buybacks and burns will appear here after their onchain transactions are recorded.</div>}
          <div className="section-action centered"><Link href="/treasury">OPEN PUBLIC LEDGER →</Link></div>
        </div>
      </section>

      <section className="home-band token-section" id="token">
        <div className="page-width token-layout">
          <div><span className="section-index">06 / $PUMPXBT</span><h2>THE DEFLATIONARY ENGINE BEHIND XBT.</h2><p>$PUMPXBT is designed around the agent economy: intelligence, caller reputation, strategy execution, and a verified profit-to-buyback-and-burn loop.</p>{tokenMint && buyUrl ? <TokenActions mint={tokenMint} buyUrl={buyUrl} /> : null}</div>
          <div className="token-roles"><article><b>01</b><strong>INTELLIGENCE</strong><span>The market and caller layer.</span></article><article><b>02</b><strong>REWARDS</strong><span>The reputation economy.</span></article><article><b>03</b><strong>STRATEGY</strong><span>The execution loop.</span></article><article><b>04</b><strong>SUPPLY</strong><span>Buybacks and burns.</span></article></div>
        </div>
      </section>

      <section className="home-band roadmap-section" id="roadmap">
        <div className="page-width roadmap-layout">
          <div><span className="section-index">07 / ROADMAP</span><h2>THE AGENT IS LIVE.<br />THE TERMINAL IS NEXT.</h2><p>XBT starts on the timeline. The upcoming PumpXBT Terminal will bring its calls, caller rankings, wallet intelligence, and market memory into one professional workspace.</p></div>
          <div className="roadmap-list">
            <article><b>01</b><div><strong>XBT INTELLIGENCE AGENT</strong><span>Market reads, direct replies, and Pump.fun calls.</span></div><small>{botHandle ? "LIVE" : "SETUP"}</small></article>
            <article><b>02</b><div><strong>CALL MEMORY</strong><span>Track calls, outcomes, and caller reputation.</span></div><small>BETA</small></article>
            <article><b>03</b><div><strong>PUMPXBT TERMINAL</strong><span>Signals, callers, wallets, and market intelligence.</span></div><small>COMING SOON</small></article>
            <article><b>04</b><div><strong>AUTONOMOUS FLYWHEEL</strong><span>Verified strategy execution, rewards, buybacks, and burns.</span></div><small>ROADMAP</small></article>
          </div>
        </div>
      </section>

      <section className="bottom-cta"><div className="page-width"><div><span>PUMPXBT / INTELLIGENCE AGENT</span><p>FOLLOW THE AGENT.<br />SEE THE CALL FIRST.</p></div>{botHandle ? <a className="primary-button" href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">FOLLOW XBT</a> : <Link className="primary-button" href="/xbt">MEET XBT</Link>}</div></section>
    </main>
  );
}
