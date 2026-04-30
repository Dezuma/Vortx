-- Vortx starter schema — apply in Supabase SQL editor or via CLI migrations.

create extension if not exists "pgcrypto";

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  description text,
  yes_price numeric(5, 4) check (yes_price >= 0 and yes_price <= 1),
  outcome text default 'open' check (outcome in ('open', 'yes', 'no', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.markets enable row level security;

-- Public read (tighten with filters when you add private markets)
create policy "markets_select_public"
  on public.markets for select
  to anon, authenticated
  using (true);

-- Writes: add authenticated policies or route inserts through Supabase Edge Functions / service role.
