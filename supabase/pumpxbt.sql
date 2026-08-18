create extension if not exists pgcrypto;

create table if not exists public.pump_tokens (
  mint text primary key,
  symbol text,
  name text,
  image_url text,
  dex_url text,
  pair_address text,
  dex_id text,
  price_usd numeric,
  market_cap_usd numeric,
  fdv_usd numeric,
  liquidity_usd numeric,
  volume_1h_usd numeric,
  volume_24h_usd numeric,
  price_change_1h numeric,
  price_change_24h numeric,
  buys_1h integer,
  sells_1h integer,
  pair_created_at timestamptz,
  score integer check (score between 0 and 100),
  score_version text,
  risk_flags text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'active', 'archived')),
  data_source text not null default 'dexscreener',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent upgrades for projects that ran an earlier PumpXBT draft.
alter table public.pump_tokens add column if not exists dex_id text;
alter table public.pump_tokens add column if not exists fdv_usd numeric;
alter table public.pump_tokens add column if not exists score_version text;
alter table public.pump_tokens add column if not exists data_source text default 'dexscreener';

create index if not exists pump_tokens_score_idx on public.pump_tokens (status, score desc);
create index if not exists pump_tokens_symbol_idx on public.pump_tokens (upper(symbol));

create table if not exists public.signal_candidates (
  candidate_key text primary key,
  token_mint text not null references public.pump_tokens(mint) on delete cascade,
  score integer not null check (score between 0 and 100),
  model_version text not null,
  evidence jsonb not null default '{}',
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviewed_candidate_has_reviewer check (
    status = 'pending' or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists signal_candidates_review_idx
  on public.signal_candidates (status, score desc, created_at desc);

create table if not exists public.tracked_wallets (
  address text primary key,
  label text not null,
  category text not null check (category in ('smart_money', 'deployer', 'cluster', 'treasury', 'watch')),
  thesis text,
  active boolean not null default true,
  last_seen_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  signature text not null,
  transfer_index integer not null,
  wallet_address text not null references public.tracked_wallets(address) on delete cascade,
  token_mint text not null references public.pump_tokens(mint) on delete cascade,
  direction text not null check (direction in ('buy', 'sell', 'transfer')),
  token_amount numeric,
  amount_usd numeric,
  counterparty text,
  block_time timestamptz not null,
  source text not null default 'helius',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.wallet_events add column if not exists event_key text;
alter table public.wallet_events add column if not exists transfer_index integer;
alter table public.wallet_events add column if not exists amount_usd numeric;
alter table public.wallet_events add column if not exists counterparty text;

create unique index if not exists wallet_events_event_key_idx
  on public.wallet_events (event_key);

create index if not exists wallet_events_time_idx on public.wallet_events (block_time desc);
create index if not exists wallet_events_token_idx on public.wallet_events (token_mint, block_time desc);

create table if not exists public.pump_trades (
  id uuid primary key default gen_random_uuid(),
  bot_project text not null,
  mention_id text not null,
  author_id text not null,
  author_username text,
  author_followers integer,
  token_mint text not null references public.pump_tokens(mint) on delete cascade,
  token_symbol text,
  token_decimals integer check (token_decimals is null or token_decimals between 0 and 18),
  token_amount numeric check (token_amount is null or token_amount >= 0),
  sol_amount numeric not null check (sol_amount >= 0),
  quote_amount_lamports text,
  status text not null default 'queued' check (status in ('queued', 'submitted', 'executed', 'failed', 'skipped')),
  reason text,
  tx_signature text unique,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pump_trades_mention_idx on public.pump_trades (bot_project, mention_id);
create index if not exists pump_trades_status_idx on public.pump_trades (status, created_at desc);
create index if not exists pump_trades_bot_project_idx on public.pump_trades (bot_project, created_at desc);
create index if not exists pump_trades_author_idx on public.pump_trades (author_id, created_at desc);

create table if not exists public.pump_signals (
  id uuid primary key default gen_random_uuid(),
  token_mint text not null references public.pump_tokens(mint) on delete cascade,
  signal_type text not null check (signal_type in ('watch', 'high_conviction')),
  status text not null default 'draft' check (status in ('draft', 'active', 'invalidated', 'closed')),
  thesis text not null,
  trigger_price_usd numeric,
  invalidation_price_usd numeric,
  confidence integer not null check (confidence between 0 and 100),
  is_premium boolean not null default true,
  approved_by text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_signal_requires_approval check (
    published_at is null or approved_by is not null
  ),
  constraint active_signal_is_published check (
    status <> 'active' or (published_at is not null and approved_by is not null)
  )
);

create index if not exists pump_signals_active_idx on public.pump_signals (status, published_at desc);

create table if not exists public.signal_updates (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.pump_signals(id) on delete cascade,
  status text not null check (status in ('update', 'invalidated', 'closed')),
  note text not null,
  price_usd numeric,
  published_at timestamptz not null default now()
);

create table if not exists public.treasury_events (
  signature text primary key,
  event_type text not null check (event_type in ('funding', 'trade_profit', 'buyback', 'burn')),
  token text not null,
  token_mint text,
  amount numeric not null check (amount > 0),
  amount_usd numeric,
  block_time timestamptz not null,
  memo text,
  source text not null default 'verified_manual',
  created_at timestamptz not null default now()
);

create index if not exists treasury_events_time_idx on public.treasury_events (block_time desc);

create table if not exists public.x_publications (
  id uuid primary key default gen_random_uuid(),
  bot_project text not null,
  event_key text not null,
  event_type text not null check (event_type in ('signal', 'trade', 'trade_profit', 'buyback', 'burn')),
  source_id text not null,
  post_text text not null,
  status text not null default 'queued' check (status in ('queued', 'published', 'failed')),
  tweet_id text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bot_project, event_key)
);

create index if not exists x_publications_status_idx
  on public.x_publications (bot_project, status, published_at desc);

create table if not exists public.access_challenges (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  nonce text not null,
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists access_challenges_wallet_idx
  on public.access_challenges (wallet, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pump_tokens_set_updated_at on public.pump_tokens;
create trigger pump_tokens_set_updated_at before update on public.pump_tokens
for each row execute function public.set_updated_at();

drop trigger if exists signal_candidates_set_updated_at on public.signal_candidates;
create trigger signal_candidates_set_updated_at before update on public.signal_candidates
for each row execute function public.set_updated_at();

drop trigger if exists tracked_wallets_set_updated_at on public.tracked_wallets;
create trigger tracked_wallets_set_updated_at before update on public.tracked_wallets
for each row execute function public.set_updated_at();

drop trigger if exists pump_signals_set_updated_at on public.pump_signals;
create trigger pump_signals_set_updated_at before update on public.pump_signals
for each row execute function public.set_updated_at();

drop trigger if exists pump_trades_set_updated_at on public.pump_trades;
create trigger pump_trades_set_updated_at before update on public.pump_trades
for each row execute function public.set_updated_at();

drop trigger if exists x_publications_set_updated_at on public.x_publications;
create trigger x_publications_set_updated_at before update on public.x_publications
for each row execute function public.set_updated_at();

alter table public.pump_tokens enable row level security;
alter table public.signal_candidates enable row level security;
alter table public.tracked_wallets enable row level security;
alter table public.wallet_events enable row level security;
alter table public.pump_signals enable row level security;
alter table public.signal_updates enable row level security;
alter table public.treasury_events enable row level security;
alter table public.access_challenges enable row level security;
alter table public.pump_trades enable row level security;
alter table public.x_publications enable row level security;

-- Intentionally no public policies. Only server-side service-role clients may read or write.
-- Wallet labels must describe verifiable public-chain observations, never non-public access.
