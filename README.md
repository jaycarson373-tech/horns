# PumpXBT

PumpXBT is a Pump.fun signal terminal plus an opt-in X mention agent. It ranks verified on-chain opportunities, tracks public wallet movement, and publishes auditable treasury records.

When `AUTO_TRADE_ENABLED=true`, the worker can execute callout-triggered SOL buys for qualifying mentions:

- fixed-size trade input (`AUTO_TRADE_SOL_AMOUNT`, default 0.1 SOL)
- follower gate (`AUTO_TRADE_FOLLOWER_THRESHOLD`, default 50)
- per-project dedupe on mention id
- per-caller cooldown via `AUTO_TRADE_MAX_CONSECUTIVE_PER_CALLER` (`0` means unlimited)
- persisted execution records in `pump_trades` for terminal PnL tracking.

## Architecture

- Next.js site and API routes on Vercel.
- Railway worker polls direct X mentions every 60 seconds.
- Supabase stores terminal snapshots, signal workflow, wallet events, access challenges, treasury receipts, and processed mention IDs.
- DexScreener supplies public market pairs and metrics.
- Helius supplies public transaction parsing.

## Database

Run both SQL files in the Supabase SQL editor:

1. [`supabase/processed_mentions.sql`](./supabase/processed_mentions.sql)
2. [`supabase/pumpxbt.sql`](./supabase/pumpxbt.sql)

RLS is enabled and no anonymous policies are created. The app uses the service role only from server-side code.

## Local Setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm run dev
```

Run one market refresh:

```bash
npm run ingest:market
```

Run one safe mention poll:

```bash
npm run poll:once
```

Keep `DRY_RUN=true` until the mention parsing, reply copy, and auto-trade thresholds are correct.

## Auto Trade Variables

```env
AUTO_TRADE_ENABLED=false
AUTO_TRADE_SOL_AMOUNT=0.1
AUTO_TRADE_FOLLOWER_THRESHOLD=50
AUTO_TRADE_SOL_MINT=So11111111111111111111111111111111111111112
AUTO_TRADE_SLIPPAGE_BPS=80
AUTO_TRADE_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
AUTO_TRADE_QUOTE_API_URL=https://quote-api.jup.ag/v6
AUTO_TRADE_PRIVATE_KEY=... # Railway worker only; or TRADER_SECRET_KEY
AUTO_TRADE_MAX_CONSECUTIVE_PER_CALLER=0
```

## Where Secrets Go

Set the token mint in **Vercel** and **Railway**:

```env
PUMPXBT_TOKEN_MINT=YOUR_TOKEN_MINT
NEXT_PUBLIC_PUMPXBT_TOKEN_MINT=YOUR_TOKEN_MINT
```

`NEXT_PUBLIC_PUMPXBT_TOKEN_MINT` is intentionally public. It drives the CA, Solscan, and buy links. `PUMPXBT_TOKEN_MINT` is the authoritative server value and must match it.

Set the trading wallet only on the **Railway worker**:

```env
AUTO_TRADE_ENABLED=false
AUTO_TRADE_PRIVATE_KEY=YOUR_BASE58_OR_JSON_SECRET_KEY
AUTO_TRADE_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

Never put `AUTO_TRADE_PRIVATE_KEY`, `TRADER_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, X secrets, or LLM keys in a `NEXT_PUBLIC_*` variable, Vercel client code, GitHub, or chat. Vercel does not need the trading wallet private key for the read-only site.

Before enabling real execution, fund a dedicated low-balance trading wallet, keep `DRY_RUN=true`, verify mention parsing with `npm run poll:once`, and then deliberately set `AUTO_TRADE_ENABLED=true` and `DRY_RUN=false` on Railway.

## X Agent

The worker reads the bot account's mentions timeline and recent direct-mention search, rejects posts without the visible `@BOT_USERNAME`, skips the bot itself and protected accounts, rate limits replies, and stores every mention under `BOT_PROJECT_KEY`.

Users should mention the bot with one Solana mint or one unambiguous cashtag:

```text
@PumpXBT_ 9abc...pump
@PumpXBT_ $TOKEN
```

If the token is unknown, the worker queues the mint for ingestion and still executes auto-trade when enabled and the caller meets follower rules. A normal snapshot includes only cached liquidity, volume, flow, momentum, score, and whether a reviewed high-conviction signal is active.

Direct-mint callouts are the deterministic path. Cashtags are accepted only when the symbol resolves to one unambiguous indexed token. The worker deduplicates mention IDs, records every execution attempt, and refuses unsupported or ambiguous tokens. Caller rewards are not distributed by the current code; only caller performance and reputation are tracked today.

Tagged replies are supported. When a mention is a reply, the worker loads the parent tweet and passes both messages to the configured text model so PumpXBT can answer the actual question in context. Set `OPENAI_API_KEY` plus `OPENAI_TEXT_MODEL` (default `gpt-5.4-nano`), or use the Claude variables. `MAX_USER_REPLIES_PER_HOUR` defaults to `10` to support short conversations while retaining spam protection.

At startup, the worker verifies that `BOT_USERNAME`, `BOT_USER_ID`, the bearer-token lookup, and the authenticated write account all resolve to the same X identity. Mentions recorded during dry run are retried once `DRY_RUN=false`; completed replies remain idempotent.

X app permissions must be **Read and write**. Generate OAuth 1.0a Access Token and Secret after setting those permissions. The app API key/secret and account access token/secret are different values.

Get the bot ID:

```bash
curl -s "https://api.x.com/2/users/by/username/YOUR_BOT_USERNAME" \
  -H "Authorization: Bearer YOUR_X_BEARER_TOKEN"
```

## Market and Signal Workflow

`/api/cron/market` runs every ten minutes. It discovers Solana addresses ending in the configured Pump suffix, refreshes their strongest-liquidity pair, calculates a deterministic screening score, and inserts candidates only when all configured thresholds pass.

The current implementation never auto-promotes candidates. Review source liquidity, token concentration, contract behavior, and invalidation before creating an active `pump_signals` row. The public UI never displays drafts or unpublished rows.

Tracked addresses are operator-curated rows in `tracked_wallets`. Their activity is labeled public wallet-cluster movement, not insider activity. Add only addresses with a documented public rationale.

Treasury claims are separate from policy. Insert a `treasury_events` row only after its signature, event type, amount, and block time are independently verifiable. Without a row, the site displays no receipt or performance number.

## Token Visibility

Set the same mint in both variables:

```env
PUMPXBT_TOKEN_MINT=REAL_MINT
NEXT_PUBLIC_PUMPXBT_TOKEN_MINT=REAL_MINT
```

`PUMPXBT_TOKEN_MINT` is authoritative server-side. The public copy is display-only.

To show the creator/trading-wallet SOL balance on the homepage, set its public address in Vercel. Never put its private key there:

```env
PUMPXBT_CREATOR_WALLET=PUBLIC_WALLET_ADDRESS
```

The homepage reads token price from DexScreener and reads realized profit and buybacks only from verified `treasury_events` rows. Missing or unverifiable values render as `--`.

## Deployment

### Vercel

Import the repository and set the site, Supabase, Helius, mint, session, and cron variables from `.env.example`. Vercel invokes `/api/cron/market` every ten minutes. Use a random `CRON_SECRET` and a random `SESSION_SECRET` of at least 32 characters.

### Railway

Create a separate service from the same repository. [`railway.json`](./railway.json) runs `npm run poll`. Add Supabase, bot identity, rate-limit, and X variables. Start with `DRY_RUN=true`, inspect one newly created mention, then deliberately switch it to `false` and redeploy.

Do not put this key outside Railway and never commit it:

- `AUTO_TRADE_PRIVATE_KEY` (or `TRADER_SECRET_KEY`)

## Required Variables

Site/API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HELIUS_API_KEY`, `PUMPXBT_TOKEN_MINT`, `NEXT_PUBLIC_PUMPXBT_TOKEN_MINT`, `SESSION_SECRET`, `CRON_SECRET`.

Worker: site Supabase variables plus `BOT_MODE`, `BOT_USERNAME`, `BOT_USER_ID`, `BOT_PROJECT_KEY`, `DRY_RUN`, `X_BEARER_TOKEN`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`.
Set one text reply provider:
- `LLM_PROVIDER=openai` (default)
- `LLM_PROVIDER=claude` with `ANTHROPIC_API_KEY` (and optional model/version overrides)
Optional Claude tuning:
- `LLM_TEMPERATURE` (default `0.1`)
- `LLM_MAX_TOKENS` (default `240`)

To execute trades, also set `AUTO_TRADE_ENABLED=true`, `AUTO_TRADE_PRIVATE_KEY` (or `TRADER_SECRET_KEY`), and `AUTO_TRADE_RPC_URL`.

Optional: `NEXT_PUBLIC_BOT_HANDLE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUY_URL`, `X_OAUTH2_USER_TOKEN`, and all threshold/rate-limit tuning variables shown in `.env.example`.
