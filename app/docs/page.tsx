import Link from "next/link";

import { pumpConfig } from "@/lib/pumpConfig";

export const metadata = {
  title: "PumpXBT Docs | Callout intelligence for Pump.fun"
};

export default function DocsPage() {
  const botHandle = pumpConfig.botHandle;

  return (
    <main className="docs-shell docs-page">
      <section className="docs-hero">
        <p className="docs-breadcrumb">PUMPXBT / DOCUMENTATION</p>
        <h1>High-frequency callout terminal for Pump.fun markets.</h1>
        <p>
          PumpXBT is a public, read-only analytics terminal with an automated callout intelligence layer.
          It ranks verified callers, surfaces top-scored tokens, and publishes execution outcomes for transparent strategy analysis.
        </p>
      </section>

      <section className="docs-grid">
        <article className="docs-panel">
          <h2>01 / SIGNAL INGESTION</h2>
          <p>
            The terminal only reacts to direct mentions/replies to the configured bot handle. There are no
            keyword-based triggers. Signals are mapped by mint or token symbol, normalized by Pump.fun liquidity and velocity,
            then tagged by conviction and token-level risk flags.
          </p>
          <p>
            The Callout Engine page is the memory layer: it keeps per-token and per-caller performance so strategy drift is visible at a glance.
          </p>
        </article>

        <article className="docs-panel">
          <h2>02 / EXECUTION TRAILS</h2>
          <p>
            Every action is logged: created, queued, submitted, executed, failed, or skipped. Current value and PNL
            are derived from public pricing and surfaced alongside each execution row.
          </p>
          <p>
            There is no wallet write from the frontend. All chain interaction remains in bot-run jobs and is intentionally constrained by configured execution limits.
          </p>
        </article>

        <article className="docs-panel">
          <h2>03 / BUYBACK + BURN POLICY</h2>
          <p>
            Creator fees can fund the PumpXBT trading wallet. PumpXBT intelligence can inform calls and trades.
            Treasury outcomes, buybacks and burns are recorded only after on-chain signatures are confirmed.
          </p>
          <p>
            The current worker does not automatically route creator fees, realized profits or caller rewards. Treasury records remain independently verifiable in the public ledger.
          </p>
          <Link href="/treasury">See treasury proof rows in terminal</Link>
        </article>

        <article className="docs-panel">
          <h2>04 / ACCESS + SAFETY</h2>
          <p>
            Free users receive terminal visibility for markets, signals, calls, callers and wallet flow.
            Higher-leverage modules can be layered as paid features without changing the same read-only proof feed.
          </p>
          <ul>
            <li>Direct mentions only.</li>
            <li>Rate-limit safe execution and idempotent mention handling.</li>
            <li>All core data is auditable by design.</li>
          </ul>
          <p>Bot handle: <strong>@{botHandle || "not set"}</strong></p>
          <Link href="/">← Back to terminal</Link>
        </article>
      </section>
    </main>
  );
}
