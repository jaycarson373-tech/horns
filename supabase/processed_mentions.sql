create extension if not exists pgcrypto;

create table if not exists public.processed_mentions (
  id uuid primary key default gen_random_uuid(),
  mention_id text unique not null,
  author_id text not null,
  author_username text,
  profile_image_url text,
  status text not null check (status in ('queued', 'processing', 'replied', 'dry_run', 'skipped', 'failed')),
  reply_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processed_mentions_author_created_idx
  on public.processed_mentions (author_id, created_at desc);

create index if not exists processed_mentions_status_created_idx
  on public.processed_mentions (status, created_at desc);

create or replace function public.set_processed_mentions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists processed_mentions_set_updated_at on public.processed_mentions;

create trigger processed_mentions_set_updated_at
before update on public.processed_mentions
for each row
execute function public.set_processed_mentions_updated_at();

alter table public.processed_mentions enable row level security;
