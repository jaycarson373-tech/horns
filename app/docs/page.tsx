import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  return (
    <main className="docs-shell docs-page">
      <section className="docs-hero">
        <p className="docs-breadcrumb">PUMPXBT / DOCUMENTATION</p>
        <h1>TRADING INTELLIGENCE THAT TRADING BOTS CAN TRUST.</h1>
        <p>
          PumpXBT is an open, source-backed intelligence terminal for Pump tokens. It ranks verified on-chain activity,
          surfaces manually published signals, and keeps treasury claims transparent on-chain.
        </p>
      </section>

      <section className="docs-grid">
        <article className="docs-panel">
          <h2>01 / CALLOUT PROTOCOL</h2>
          <p>
            Signal candidates must originate from Pump.fun callouts. Public signals move through three gates before a call is
            published:
          </p>
          <ol>
            <li>Caller must be verified.</li>
            <li>Caller needs a demonstrated high win-rate on recent play history.</li>
            <li>AI ranker checks consistency, freshness, thesis quality, and risk behavior.</li>
          </ol>
        </article>

        <article className="docs-panel">
          <h2>02 / PROFIT MANDATE</h2>
          <p>
            100% of realized callout profits are routed to <strong>buybacks</strong> and then to <strong>burns</strong>. No hidden
            splits.
          </p>
          <p>Public burn/buyback evidence is anchored to on-chain Solscan proof rows.</p>
        </article>

        <article className="docs-panel">
          <h2>03 / ACCESS MODEL</h2>
          <p>
            The public section is open. Premium sections require a minimum token holding gate and are
            cryptographically verified per-session.
          </p>
          <ul>
            <li>Premium unlock is non-custodial.</li>
            <li>Holdings are validated via chain state, not wallet permissions.</li>
            <li>All checks are read-only and logged by server state.</li>
          </ul>
        </article>

        <article className="docs-panel">
          <h2>04 / API SAFETY</h2>
          <p>
            Supabase, Helius, and Solscan are used for read-only verification and ranking support. Data is
            cached server-side and exposed on demand.
          </p>
          <p>
            X replies are opt-in and triggered only by direct mentions or replies to @{process.env.NEXT_PUBLIC_BOT_HANDLE || "bot"}.
          </p>
          <Link href="/">← Back to terminal</Link>
        </article>
      </section>
    </main>
  );
}
