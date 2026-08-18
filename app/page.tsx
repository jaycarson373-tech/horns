import Link from "next/link";

import { ContractAddress } from "@/components/contract-address";
import { TokenActions } from "@/components/token-actions";
import { pumpConfig } from "@/lib/pumpConfig";
import { readTerminalData, type PumpSignal, type TreasuryEvent } from "@/lib/pumpData";
import { formatSol, formatUsd, relativeTime, shortAddress, signalCategory } from "@/lib/pumpPresentation";
import { readProjectMetrics } from "@/lib/projectMetrics";

export const dynamic = "force-dynamic";

const REWARD_STEPS = ["CALL", "TRACK", "PROVE", "EARN"] as const;
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
  const askXbtUrl = botHandle ? `https://x.com/intent/post?text=${encodeURIComponent(`@${botHandle} `)}` : "";
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
          <span className="protocol-label"><i className={data.connected ? "live" : ""} />PUMPXBT / PUMP.FUN AGENTIC INTELLIGENCE</span>
          <h1>PUMP<span>XBT</span></h1>
          <h2>THE AGENT-POWERED INTELLIGENCE LAYER FOR PUMP.FUN</h2>
          <p>Live calls, onchain intelligence, smart-money tracking and autonomous trading across Pump.fun.</p>
          <div className="button-row">
            <Link className="primary-button" href="/terminal">OPEN TERMINAL</Link>
            <Link className="secondary-button" href="/signals">VIEW LIVE CALLS</Link>
          </div>
        </div>
      </section>

      {tokenMint ? <section className="home-contract-strip" aria-label="PumpXBT contract address"><div className="page-width"><ContractAddress mint={tokenMint} pumpFunUrl={pumpConfig.pumpFunTokenUrl} /></div></section> : null}

      <section className="home-live-metrics" aria-label="Verified PumpXBT metrics">
        <div className="page-width">
          <article><span>$PUMPXBT PRICE</span><strong>{formatUsd(projectMetrics.priceUsd ?? data.projectToken?.price_usd ?? null)}</strong><small>DEX MARKET</small></article>
          <article><span>CREATOR / TRADING WALLET</span><strong>{formatSol(projectMetrics.creatorWalletSol)}</strong>{projectMetrics.creatorWallet ? <a href={`https://solscan.io/account/${projectMetrics.creatorWallet}`} target="_blank" rel="noreferrer">{shortAddress(projectMetrics.creatorWallet)} ↗</a> : <small>WALLET NOT CONFIGURED</small>}</article>
          <article><span>VERIFIED REALIZED PROFIT</span><strong>{formatUsd(realizedProfitUsd)}</strong><small>TREASURY LEDGER</small></article>
          <article><span>TOTAL $PUMPXBT BUYBACKS</span><strong>{boughtBack == null ? "--" : formatTokenAmount(boughtBack)}</strong><small>CONFIRMED EVENTS</small></article>
        </div>
      </section>

      <section className="home-band calls-section">
        <div className="page-width home-split-heading">
          <div><span className="section-index">01 / XBT CALLS</span><h2>HIGH-QUALITY CALLS.<br />NOT MORE NOISE.</h2></div>
          <p>PumpXBT connects market activity, proven callers and smart-money flow to surface high-quality opportunities across Pump.fun.</p>
        </div>
        <div className="page-width home-call-grid">
          {liveSignals.map((signal) => <LiveCall signal={signal} key={signal.id} />)}
          {liveSignals.length === 0 ? <div className="home-honest-empty"><strong>NO HIGH-CONVICTION SIGNALS</strong><span>PumpXBT is still scanning.</span></div> : null}
        </div>
        <div className="page-width section-action"><Link href="/signals">VIEW ALL CALLS →</Link></div>
      </section>

      <section className="home-band rewards-section">
        <div className="page-width">
          <div className="home-split-heading">
            <div><span className="section-index">02 / CALLER REPUTATION</span><h2>GOOD CALLS SHOULD GET PAID.</h2></div>
            <div className="section-copy"><p>PumpXBT tracks actual call performance so proven edge can be measured.</p><small>PERFORMANCE OVER REACH. / REWARDS NOT YET AUTOMATED</small></div>
          </div>
          <div className="reward-flow">
            {REWARD_STEPS.map((step, index) => <div key={step}><b>{String(index + 1).padStart(2, "0")}</b><strong>{step}</strong></div>)}
          </div>
          <div className="section-action"><Link href="/callers">VIEW CALLERS →</Link></div>
        </div>
      </section>

      <section className="home-band system-section">
        <div className="page-width">
          <span className="section-index">03 / XBT AGENT</span>
          <h2>XBT NEVER STOPS WATCHING.</h2>
          <p className="agent-intro">A continuous intelligence layer connecting Pump.fun markets, callers, wallets and momentum in real time.</p>
          <div className="agent-functions" aria-label="XBT agent functions">
            {AGENT_FUNCTIONS.map(([label, copy], index) => <div key={label}><b>{String(index + 1).padStart(2, "0")}</b><strong>{label}</strong><span>{copy}</span></div>)}
          </div>
          <div className="section-action on-dark"><Link href="/xbt">OPEN XBT →</Link></div>
        </div>
      </section>

      {botHandle ? <section className="home-band xbt-ask-section">
        <div className="page-width home-split-heading">
          <div><span className="section-index">04 / PUMPXBT ON X</span><h2>ASK PUMPXBT<br />ON X.</h2></div>
          <div className="section-copy"><p>Send PumpXBT a contract address or ask what it thinks about a token. PumpXBT breaks down what it can verify across wallets, onchain activity and market signals.</p><div className="xbt-ask-capabilities"><span>TOKEN READS</span><span>PUBLIC CALLOUTS</span><span>ACTIVE CALL FOLLOW-UPS</span></div><a className="inline-cta" href={askXbtUrl} target="_blank" rel="noreferrer">ASK PUMPXBT →</a></div>
        </div>
      </section> : null}

      <section className="home-band execution-section">
        <div className="page-width execution-layout">
          <div><span className="section-index">05 / EXECUTION</span><h2>INTELLIGENCE WITH<br />SKIN IN THE GAME.</h2><p>Creator fees can fund the PumpXBT trading wallet. PumpXBT can trade from the same intelligence behind its public calls. Realized outcomes appear only after verification.</p></div>
          <div className="execution-rail">
            <header><span>XBT / TRADE WALLET</span><strong>{executedTrades.length > 0 ? "VERIFIED ACTIVITY" : "NO VERIFIED TRADES"}</strong></header>
            <div className="execution-path"><span>FIND THE SIGNAL</span><i /><span>MAKE THE CALL</span><i /><span>TAKE THE TRADE</span><i /><span>FEED THE FLYWHEEL</span></div>
            <footer>{executedTrades.length > 0 ? `${executedTrades.length} verified execution record${executedTrades.length === 1 ? "" : "s"} in the current ledger view.` : "EXECUTION RECORD QUIET / PUMPXBT IS STILL WATCHING"}<span>DEFAULT SIZE / 1% OF WALLET / 0.02 SOL MINIMUM</span></footer>
          </div>
        </div>
      </section>

      <section className="home-band burn-section">
        <div className="page-width">
          <span className="section-index">06 / BUYBACK & BURN</span>
          <h2>THE PUMPXBT FLYWHEEL</h2>
          <div className="flywheel-flow expanded" aria-label="Creator fees to verified buyback and burn policy"><strong>CREATOR FEES</strong><span>→</span><strong>PUMPXBT WALLET</strong><span>→</span><strong>CALLS + TRADES</strong><span>→</span><strong>REALIZED PROFITS</strong><span>→</span><strong>VERIFIED BUYBACK & BURN</strong></div>
          <div className="flywheel-copy"><p>Creator fees can fund the PumpXBT trading wallet.</p><p>PumpXBT intelligence informs calls and trades.</p><p><strong>Profit, buyback and burn records appear only after verification.</strong></p></div>
          {hasVerifiedFlywheelData ? <div className="verified-flywheel-data">
            {realizedProfitUsd != null ? <article><span>VERIFIED REALIZED PROFIT</span><strong>{formatUsd(realizedProfitUsd)}</strong></article> : null}
            {boughtBack != null ? <article><span>$PUMPXBT BOUGHT BACK</span><strong>{formatTokenAmount(boughtBack)}</strong></article> : null}
            {burned != null ? <article><span>$PUMPXBT BURNED</span><strong>{formatTokenAmount(burned)}</strong></article> : null}
          </div> : <div className="flywheel-proof-empty"><strong>NO VERIFIED BUYBACKS YET</strong><span>Onchain records appear here after a confirmed transaction.</span></div>}
          <div className="section-action centered"><Link href="/treasury">OPEN PUBLIC LEDGER →</Link></div>
        </div>
      </section>

      <section className="home-band token-section" id="token">
        <div className="page-width token-layout">
          <div><span className="section-index">07 / $PUMPXBT</span><h2>THE DEFLATIONARY ENGINE BEHIND XBT.</h2><p>$PUMPXBT connects the intelligence layer, XBT agent, caller reputation, trade wallet, and verified buyback-and-burn loop.</p>{tokenMint && buyUrl ? <TokenActions mint={tokenMint} buyUrl={buyUrl} /> : null}</div>
          <div className="token-roles"><article><b>01</b><strong>INTELLIGENCE</strong><span>The market and caller layer.</span></article><article><b>02</b><strong>REWARDS</strong><span>The reputation economy.</span></article><article><b>03</b><strong>STRATEGY</strong><span>The execution loop.</span></article><article><b>04</b><strong>SUPPLY</strong><span>Buybacks and burns.</span></article></div>
        </div>
      </section>

      <section className="bottom-cta"><div className="page-width"><div><span>PUMPXBT / AGENTIC INTELLIGENCE</span><p>SEE PUMP.FUN<br />BEFORE THE TIMELINE DOES.</p></div><Link className="primary-button" href="/terminal">OPEN PUMPXBT</Link></div></section>
    </main>
  );
}
