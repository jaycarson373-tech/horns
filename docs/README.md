# PumpXBT Documentation

## What this repo does
- Next.js public site with terminal analytics, signal board, and receipts panel.
- Read-only Supabase-backed ingestion and wallet/signal state.
- Railway worker for the X mention agent (`poll-mentions.ts`) with dry-run mode.

## Quick start
1. Copy `.env.example` to `.env`.
2. Fill required variables.
3. Run:
   - `npm install`
   - `npm run typecheck`
   - `npm run dev`

## Required environment variables

### Site and data
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HELIUS_API_KEY`
- `PUMPXBT_TOKEN_MINT`
- `NEXT_PUBLIC_PUMPXBT_TOKEN_MINT`
- `SESSION_SECRET`
- `CRON_SECRET`
- `MAX_PREMIUM_REQUESTS_PER_WINDOW`

### X bot worker
- `BOT_MODE`
- `BOT_USERNAME`
- `BOT_USER_ID`
- `BOT_PROJECT_KEY`
- `DRY_RUN`
- `X_BEARER_TOKEN`
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

### Optional / feature
- `NEXT_PUBLIC_BOT_HANDLE`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BUY_URL`
- `X_OAUTH2_USER_TOKEN`
- `OPENAI_API_KEY`
- `REPLICATE_API_TOKEN`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_MODERATION_MODEL`

## Bot flow
1. Worker fetches direct mentions/replies for `@BOT_USERNAME`.
2. Dedupes by `BOT_PROJECT_KEY` + `mention_id`.
3. Parses valid callout format and checks mention gates.
4. Ranks the callout with live signal criteria and caller context.
5. Posts a text reply with execution guidance and optional trade status.
6. Records status and metadata in `processed_mentions`.

## Deployment

### Vercel
- Import repo, set all required env vars, deploy.
- `/api/cron/market` is called every 10 minutes.

### Railway
- Deploy worker only with `poll` command.
- Keep `DRY_RUN=true` for first validation run.

## Common checks
- Bot replies missing: verify env `DRY_RUN` is `false` and `BOT_PROJECT_KEY` matches deployed environment.
- Wrong username/account: confirm `BOT_USERNAME` and `BOT_USER_ID` match target bot account.
- No media upload: confirm Twitter/X app has read/write app permission and non-expired OAuth token pair.

## Useful SQL
- `supabase/processed_mentions.sql`
- `supabase/pumpxbt.sql`

## Supabase tables in play
- `processed_mentions`
- `market_snapshots`
- `tracked_wallets`
- `wallet_movements`
- `pump_signals`
- `donations`

## Production safety
- Set `DRY_RUN=false` only after successful test in staging.
- Keep private keys and signing wallets out of this repo and out of environment values.
