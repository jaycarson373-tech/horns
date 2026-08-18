import Link from "next/link";

import { CallerTable } from "@/components/caller-table";
import { MarketTerminal } from "@/components/market-terminal";
import { SectionHeading } from "@/components/section-heading";
import { SignalBoard } from "@/components/signal-board";
import { TokenActions } from "@/components/token-actions";
import { pumpConfig } from "@/lib/pumpConfig";
import { readCalloutEngineData, readTerminalData } from "@/lib/pumpData";
import {
  buildMarketRows,
  buildWalletClusters,
  buildXbtReads,
  formatPercent,
  formatUsd,
  relativeTime,
  tokenName
} from "@/lib/pumpPresentation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, engine] = await Promise.all([readTerminalData(), readCalloutEngineData({ limit: 120 })]);
  const rows = buildMarketRows(data, engine);
  const reads = buildXbtReads(data, engine);
  const clusters = buildWalletClusters(data.walletEvents);
  const tokenMint = pumpConfig.tokenMint || pumpConfig.publicTokenMint;
  const buyUrl = process.env.NEXT_PUBLIC_BUY_URL?.trim() || (tokenMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${encodeURIComponent(tokenMint)}` : "");

  return (
    <main>
      <section className="compact-hero page-width">
        <div className="hero-message">
          <span className="live-label"><i className={data.connected ? "live" : ""} />PUMPXBT / LIVE INTELLIGENCE</span>
          <h1>PUMP<span>XBT</span></h1>
          <h2>THE INTELLIGENCE LAYER FOR PUMP.FUN</h2>
          <p>Track the best callers. Watch smart-money flow. Find what’s moving before the timeline does.</p>
          <div className="button-row"><Link className="primary-button" href="/terminal">OPEN TERMINAL</Link><Link className="secondary-button" href="/signals">VIEW SIGNALS</Link></div>
        </div>
        <div className="hero-preview" aria-label="Live PumpXBT market preview">
          <header><span>XBT MARKET WATCH</span><small>{data.updatedAt ? `UPDATED ${relativeTime(data.updatedAt).toUpperCase()} AGO` : "AWAITING SYNC"}</small></header>
          <div className="preview-head"><span>ASSET</span><span>1H</span><span>FLOW</span><span>SCORE</span></div>
          {rows.slice(0, 5).map((token) => <a key={token.mint} href={token.dex_url || `https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer"><span className="preview-token"><i>{token.symbol?.slice(0, 1) || "•"}</i><strong>{tokenName(token)}</strong></span><span className={(token.price_change_1h ?? 0) >= 0 ? "positive" : "negative"}>{formatPercent(token.price_change_1h)}</span><span>{token.smartWallets ? `${token.smartWallets}W / ${token.callers}C` : "--"}</span><strong>{token.score?.toFixed(0) ?? "--"}</strong></a>)}
          {rows.length === 0 ? <div className="preview-empty"><span /><span /><span /><small>Market feed awaiting first indexed snapshot.</small></div> : null}
          <footer><span>VOLUME</span><strong>{formatUsd(rows.reduce((sum, token) => sum + (token.volume_1h_usd ?? 0), 0))}</strong><span>TRACKED</span><strong>{data.stats.trackedMarkets ?? "--"}</strong></footer>
        </div>
      </section>

      <div className="tape"><div><span>PUMP.FUN MARKET STATUS</span><strong>{data.connected ? "ONLINE" : "DELAYED"}</strong><span>ACTIVE SIGNALS</span><strong>{data.stats.activeSignals ?? "--"}</strong><span>SMART WALLETS</span><strong>{data.stats.trackedWallets ?? "--"}</strong><span>CALLOUTS INDEXED</span><strong>{engine.trades.length}</strong><span>LAST UPDATE</span><strong>{relativeTime(data.updatedAt)}</strong></div></div>

      <section className="product-section page-width" id="terminal">
        <SectionHeading eyebrow="01 / LIVE MARKET TERMINAL" title="PUMP.FUN, RANKED BY SIGNAL" description="Liquidity, momentum, smart-wallet activity, caller convergence, and XBT score." href="/terminal" linkLabel="FULL TERMINAL" />
        <MarketTerminal rows={rows} compact />
      </section>

      <section className="product-section page-width" id="signals">
        <SectionHeading eyebrow="02 / XBT SIGNALS" title="SIGNALS, NOT NOISE" description="Reviewed setups backed by live market evidence." href="/signals" linkLabel="ALL SIGNALS" />
        <SignalBoard signals={data.signals} limit={4} />
      </section>

      <section className="product-section page-width dual-section">
        <div>
          <SectionHeading eyebrow="03 / TOP CALLERS" title="KNOW WHO ACTUALLY MAKES GOOD CALLS" href="/callers" linkLabel="LEADERBOARD" />
          <CallerTable callers={engine.callers} compact />
        </div>
        <div>
          <SectionHeading eyebrow="04 / SMART MONEY" title="TRACK THE WALLETS THAT MATTER" href="/wallets" linkLabel="WALLET FEED" />
          <div className="wallet-cluster-feed">
            {clusters.slice(0, 7).map((cluster) => <Link key={cluster.tokenMint} href={`/terminal?q=${encodeURIComponent(cluster.tokenMint)}`}><span><i className="flow-dot" /><strong>{cluster.walletCount} tracked wallet{cluster.walletCount === 1 ? "" : "s"}</strong> active in {cluster.token}</span><small>{cluster.buyCount} buys · {relativeTime(cluster.latest)} ago</small></Link>)}
            {clusters.length === 0 ? <div className="product-empty">Wallet activity appears after Helius confirms tracked flows.</div> : null}
          </div>
        </div>
      </section>

      <section className="product-section xbt-section" id="xbt">
        <div className="page-width">
          <SectionHeading eyebrow="05 / XBT ANALYST" title="THE MARKET READ" description="A continuous intelligence feed built from Pump.fun market structure, wallets, callers, and momentum." href="/xbt" linkLabel="OPEN XBT" />
          <div className="xbt-read-grid">
            {reads.slice(0, 4).map((read) => <article key={`${read.label}-${read.headline}`}><header><span>{read.label}</span><i>LIVE</i></header><h3>{read.headline}</h3><p>{read.detail}</p><footer>{read.tokens.map((token) => <span key={token}>{token}</span>)}</footer></article>)}
            {reads.length === 0 ? <div className="product-empty">XBT market reads publish after the first verified market snapshot.</div> : null}
          </div>
        </div>
      </section>

      <section className="product-section page-width flywheel-section" id="treasury">
        <SectionHeading eyebrow="06 / TREASURY" title="THE PUMPXBT FLYWHEEL" href="/treasury" linkLabel="VIEW TREASURY" />
        <div className="flywheel"><strong>FEES</strong><span>→</span><strong>PLAYS</strong><span>→</span><strong>PROFITS</strong><span>→</span><strong>BURN</strong></div>
        <div className="flywheel-copy"><p>A portion of PumpXBT fees funds the treasury.</p><p>The treasury takes positions based on PumpXBT intelligence.</p><p>Profits buy back and burn $PUMPXBT.</p></div>
        {tokenMint && buyUrl ? <TokenActions mint={tokenMint} buyUrl={buyUrl} /> : null}
      </section>

      <section className="bottom-cta"><div className="page-width"><p>SEE PUMP.FUN BEFORE THE TIMELINE DOES.</p><Link className="primary-button" href="/terminal">OPEN PUMPXBT</Link></div></section>
    </main>
  );
}
