create table if not exists public.donations (
  signature text primary key,
  block_time timestamptz not null,
  amount_lamports numeric not null check (amount_lamports > 0),
  token text not null check (token in ('SOL', 'USDC')),
  usd_at_time numeric,
  memo text
);

create index if not exists donations_block_time_idx on public.donations (block_time desc);
alter table public.donations enable row level security;
