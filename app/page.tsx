import Image from "next/image";
import { cookies } from "next/headers";

import { AccessPanel } from "@/components/access-panel";
import { TokenActions } from "@/components/token-actions";
import { ACCESS_COOKIE, accessIsConfigured, formatTokenBalance, parseAccessToken } from "@/lib/access";
import { pumpConfig } from "@/lib/pumpConfig";
import { readTerminalData, type PumpSignal, type PumpToken, type WalletEvent } from "@/lib/pumpData";

export const dynamic = "force-dynamic";

function money(value: number | null) {
  if (value == null) return "--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function percent(value: number | null) {
  if (value == null) return <span className="muted">--</span>;
  return <span className={value >= 0 ? "positive" : "negative"}>{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

function relativeTime(value: string | null) {
  if (!value) return "NO VERIFIED UPDATE";
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "JUST NOW";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}M AGO`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}H AGO`;
  return `${Math.floor(seconds / 86_400)}D AGO`;
}

function relation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function tokenName(token: PumpToken) {
  return token.symbol ? `$${token.symbol.toUpperCase()}` : `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`;
}

function compactInteger(value: number) {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return value.toLocaleString("en-US");
}

function SignalRow({ signal }: { signal: PumpSignal }) {
  const token = relation(signal.token);
  return (
    <article className="signal-row">
      <div><span className={`signal-kind ${signal.signal_type}`}>{signal.signal_type === "high_conviction" ? "HIGH CONVICTION" : "WATCH"}</span><time>{relativeTime(signal.published_at)}</time></div>
      <h3>{token?.symbol ? `$${token.symbol}` : `${signal.token_mint.slice(0, 5)}...${signal.token_mint.slice(-4)}`}</h3>
      <p>{signal.thesis}</p>
      <footer><span>CONF {signal.confidence}/100</span><span>STATUS {signal.status.toUpperCase()}</span></footer>
    </article>
  );
}

function WalletEventRow({ event }: { event: WalletEvent }) {
  const wallet = relation(event.wallet);
  const token = relation(event.token);
  return (
    <li>
      <span className={`flow-direction ${event.direction}`}>{event.direction.toUpperCase()}</span>
      <div><strong>{wallet?.label || `${event.wallet_address.slice(0, 4)}...${event.wallet_address.slice(-4)}`}</strong><small>{wallet?.category?.replaceAll("_", " ") || "public wallet"}</small></div>
      <div><strong>{token?.symbol ? `$${token.symbol}` : `${event.token_mint.slice(0, 4)}...`}</strong><small>{event.token_amount == null ? "amount unavailable" : event.token_amount.toLocaleString("en-US", { maximumFractionDigits: 3 })}</small></div>
      <a href={`https://solscan.io/tx/${event.signature}`} target="_blank" rel="noreferrer">↗</a>
    </li>
  );
}

export default async function Home() {
  const cookieStore = await cookies();
  const session = parseAccessToken(cookieStore.get(ACCESS_COOKIE)?.value);
  const premium = Boolean(session);
  const data = await readTerminalData(premium);
  const tokenMint = pumpConfig.tokenMint || pumpConfig.publicTokenMint;
  const botHandle = pumpConfig.botHandle;
  const buyUrl = process.env.NEXT_PUBLIC_BUY_URL?.trim()
    || (tokenMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${encodeURIComponent(tokenMint)}` : "");
  const dataStale = data.updatedAt ? Date.now() - Date.parse(data.updatedAt) > 20 * 60_000 : false;

  return (
    <div className="terminal-shell">
      <header className="terminal-header">
        <a className="brand" href="#terminal" aria-label="PumpXBT terminal">
          <Image src="/pumpxbt-mark.png" alt="" width={46} height={46} priority />
          <span>PUMP<b>XBT</b></span>
        </a>
        <div className="header-feed"><span className={`status-dot ${data.connected ? "live" : ""}`} />{data.connected ? "DATA LINK ACTIVE" : "DATA LINK OFFLINE"}<i />PUMP TOKENS ONLY</div>
        <div className="header-actions">
          {botHandle ? <a href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">@{botHandle}</a> : null}
          <a href="#access" className="unlock-link">{premium ? "PRO ACTIVE" : "UNLOCK PRO"}</a>
        </div>
      </header>

      <div className="terminal-layout">
        <nav className="terminal-rail" aria-label="Terminal sections">
          <a href="#terminal" title="Markets">MKT</a><a href="#signals" title="Signals">SIG</a><a href="#wallets" title="Wallet flow">WAL</a><a href="#policy" title="Treasury policy">TRY</a>
          <span className="rail-version">V0.1</span>
        </nav>

        <main id="terminal">
          <section className="terminal-titlebar">
            <div><p className="eyebrow"><span>AGENT 01</span> SOLANA PUMP INTELLIGENCE</p><h1>MARKET STRUCTURE.<br /><b>WITHOUT THE NOISE.</b></h1></div>
            <div className="asof"><span>LAST INDEX</span><strong>{relativeTime(data.updatedAt)}</strong>{dataStale ? <em>DELAYED</em> : null}</div>
          </section>

          {tokenMint && buyUrl ? <TokenActions mint={tokenMint} buyUrl={buyUrl} /> : null}

          <section className="stat-strip" aria-label="Terminal statistics">
            <div><span>INDEXED MARKETS</span><strong>{data.stats.trackedMarkets ?? "--"}</strong></div>
            <div><span>ACTIVE SIGNALS</span><strong>{data.stats.activeSignals ?? "--"}</strong></div>
            <div><span>TRACKED WALLETS</span><strong>{premium ? data.stats.trackedWallets ?? "--" : "LOCKED"}</strong></div>
            <div><span>24H FLOW EVENTS</span><strong>{premium ? data.stats.walletEvents24h ?? "--" : "LOCKED"}</strong></div>
          </section>

          <section className="market-panel terminal-panel" aria-labelledby="market-title">
            <div className="panel-heading"><div><span>01 / LIVE INDEX</span><h2 id="market-title">PUMP MARKET TAPE</h2></div><p>DEXSCREENER SOURCE · SOLANA</p></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>ASSET</th><th>PRICE</th><th>MCAP</th><th>LIQ</th><th>VOL 1H</th><th>1H</th><th>B / S</th><th>SCORE</th><th>RISK</th></tr></thead>
                <tbody>
                  {data.tokens.length ? data.tokens.map((token) => (
                    <tr key={token.mint}>
                      <td><a href={token.dex_url || `https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer"><strong>{tokenName(token)}</strong><small>{token.name || `${token.mint.slice(0, 6)}...${token.mint.slice(-4)}`}</small></a></td>
                      <td>{money(token.price_usd)}</td><td>{money(token.market_cap_usd)}</td><td>{money(token.liquidity_usd)}</td><td>{money(token.volume_1h_usd)}</td>
                      <td>{percent(token.price_change_1h)}</td><td>{token.buys_1h ?? "--"} / {token.sells_1h ?? "--"}</td><td><b className="score">{token.score ?? "--"}</b></td>
                      <td>{token.risk_flags.length ? <span className="risk">{token.risk_flags.length} FLAG{token.risk_flags.length === 1 ? "" : "S"}</span> : <span className="clear">CLEAR</span>}</td>
                    </tr>
                  )) : <tr className="empty-row"><td colSpan={9}>{data.error || "No verified pump markets indexed yet."}</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="method-note">Score ranks liquidity, volume, activity, flow balance, and short-term volatility. It is not a trade recommendation.</p>
          </section>

          <div className="analysis-grid">
            <section className="terminal-panel signals-panel" id="signals" aria-labelledby="signal-title">
              <div className="panel-heading"><div><span>02 / ANALYST DESK</span><h2 id="signal-title">SIGNAL ENGINE</h2></div><p>{premium ? "PRO FEED" : "PUBLIC FEED"}</p></div>
              <div className="signal-list">{data.signals.length ? data.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />) : <div className="honest-empty"><strong>NO HIGH-CONVICTION SETUP.</strong><span>The desk does not force a call.</span></div>}</div>
            </section>

            <section className="terminal-panel wallet-panel" id="wallets" aria-labelledby="wallet-title">
              <div className="panel-heading"><div><span>03 / PUBLIC ON-CHAIN</span><h2 id="wallet-title">WALLET CLUSTER FLOW</h2></div><p>HELIUS INDEXED</p></div>
              {premium ? <ul className="wallet-list">{data.walletEvents.length ? data.walletEvents.map((event) => <WalletEventRow key={event.id} event={event} />) : <li className="honest-empty"><strong>NO VERIFIED FLOW EVENTS.</strong><span>Tracked wallets are manually curated.</span></li>}</ul> : <div className="locked-state"><span>{compactInteger(pumpConfig.accessThresholdTokens)}</span><strong>PRO ACCESS REQUIRED</strong><p>Wallet labels, cluster movement, and premium signal detail are holder-gated.</p><a href="#access">VERIFY HOLDINGS</a></div>}
            </section>
          </div>

          <section className="terminal-panel policy-panel" id="policy" aria-labelledby="policy-title">
            <div className="panel-heading"><div><span>04 / TREASURY MANDATE</span><h2 id="policy-title">FEES → PLAYS.<br />PROFITS → BURN.</h2></div><p>READ-ONLY BUILD</p></div>
            <div className="policy-grid">
              <article><span>01</span><h3>100% FEE ALLOCATION</h3><p>Mandate: platform fees fund approved early-position research and trades. No position is opened by this application.</p></article>
              <article><span>02</span><h3>HIGH CONVICTION ONLY</h3><p>Calls require a published thesis, invalidation level, confidence score, and named manual approval.</p></article>
              <article><span>03</span><h3>BUYBACK + BURN</h3><p>Mandate: realized trading profits go to transparent token buybacks and burns after execution custody is established.</p></article>
            </div>
            <div className="receipt-ledger">
              <h3>VERIFIED TREASURY LEDGER</h3>
              {data.treasuryEvents.length ? <ul>{data.treasuryEvents.map((event) => <li key={event.signature}><time>{new Date(event.block_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time><strong>{event.event_type.replaceAll("_", " ").toUpperCase()}</strong><span>{event.amount.toLocaleString("en-US", { maximumFractionDigits: 9 })} {event.token}</span><a href={`https://solscan.io/tx/${event.signature}`} target="_blank" rel="noreferrer">TX ↗</a></li>)}</ul> : <p>No verified treasury transactions published yet.</p>}
            </div>
          </section>

          {botHandle ? <section className="bot-strip" aria-label="PumpXBT X agent"><div><span>05 / X AGENT</span><h2>ONE MINT.<br />ONE VERDICT.</h2></div><a href={`https://x.com/${botHandle}`} target="_blank" rel="noreferrer">OPEN @{botHandle} ↗</a></section> : null}
        </main>

        <aside className="terminal-aside">
          <AccessPanel configured={accessIsConfigured()} threshold={pumpConfig.accessThresholdTokens} session={session ? { wallet: session.wallet, verifiedBalance: formatTokenBalance(session.balanceRaw, session.decimals) } : null} />
          <section className="side-panel"><div className="panel-label"><span>RULESET</span><b>02</b></div><ul><li><span>UNIVERSE</span><strong>PUMP TOKENS</strong></li><li><span>CALL FILTER</span><strong>MANUAL APPROVAL</strong></li><li><span>MIN CONFIDENCE</span><strong>{pumpConfig.highConvictionMinScore}/100</strong></li><li><span>DATA</span><strong>PUBLIC SOURCES</strong></li></ul></section>
          <section className="side-panel disclosure"><div className="panel-label"><span>DISCLOSURE</span><b>03</b></div><p>Analytics are informational. Wallet labels are based on public activity and do not imply inside information. Digital assets are high risk.</p></section>
          <Image className="aside-mark" src="/pumpxbt-mark.png" alt="PumpXBT analyst mark" width={280} height={280} />
        </aside>
      </div>

      <footer><span>PUMPXBT / PUBLIC DATA INTELLIGENCE</span><span>NO CUSTODY · NO AUTOTRADING · NO GUARANTEED RETURNS</span></footer>
    </div>
  );
}
