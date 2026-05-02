-- Vortx production-shaped schema — safe to rerun in Supabase SQL editor or CLI migrations.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  description text,
  yes_price numeric(5, 4) check (yes_price >= 0 and yes_price <= 1),
  outcome text default 'open' check (outcome in ('open', 'yes', 'no', 'void')),
  source_url text,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.markets
  add column if not exists source_url text,
  add column if not exists closes_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.markets enable row level security;

drop trigger if exists markets_set_updated_at on public.markets;
create trigger markets_set_updated_at
  before update on public.markets
  for each row execute function public.set_updated_at();

create index if not exists markets_updated_at_idx on public.markets (updated_at desc);
create index if not exists markets_outcome_idx on public.markets (outcome);

drop policy if exists "markets_select_public" on public.markets;
create policy "markets_select_public"
  on public.markets for select
  to anon, authenticated
  using (true);

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  source text not null default 'site',
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'unsubscribed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_email_format check (position('@' in email) > 1)
);

alter table public.waitlist_signups
  alter column email type citext using email::citext;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_signups_email_key'
      and conrelid = 'public.waitlist_signups'::regclass
  ) then
    alter table public.waitlist_signups add constraint waitlist_signups_email_key unique (email);
  end if;
end;
$$;

create unique index if not exists waitlist_signups_email_lower_key
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

drop trigger if exists waitlist_signups_set_updated_at on public.waitlist_signups;
create trigger waitlist_signups_set_updated_at
  before update on public.waitlist_signups
  for each row execute function public.set_updated_at();

drop policy if exists "waitlist_insert_public" on public.waitlist_signups;
create policy "waitlist_insert_public"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  plan text not null check (plan in ('nebula', 'supernova', 'galactic', 'custom')),
  price_id text not null,
  mode text not null check (mode in ('payment', 'subscription')),
  status text not null default 'created',
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkout_sessions enable row level security;

drop trigger if exists checkout_sessions_set_updated_at on public.checkout_sessions;
create trigger checkout_sessions_set_updated_at
  before update on public.checkout_sessions
  for each row execute function public.set_updated_at();

create index if not exists checkout_sessions_plan_idx on public.checkout_sessions (plan);
create index if not exists checkout_sessions_created_at_idx on public.checkout_sessions (created_at desc);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  display_name text,
  tier text not null default 'free' check (tier in ('free', 'nebula', 'supernova', 'galactic', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create table if not exists public.market_events (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.markets(id) on delete cascade,
  event_type text not null check (event_type in ('oracle_update', 'price_update', 'resolution', 'note')),
  probability numeric(5, 4) check (probability >= 0 and probability <= 1),
  source_url text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.market_events enable row level security;

create index if not exists market_events_market_created_idx
  on public.market_events (market_id, created_at desc);

drop policy if exists "market_events_select_public" on public.market_events;
create policy "market_events_select_public"
  on public.market_events for select
  to anon, authenticated
  using (true);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, market_id)
);

alter table public.watchlists enable row level security;

create index if not exists watchlists_user_created_idx on public.watchlists (user_id, created_at desc);

drop policy if exists "watchlists_select_own" on public.watchlists;
create policy "watchlists_select_own"
  on public.watchlists for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "watchlists_insert_own" on public.watchlists;
create policy "watchlists_insert_own"
  on public.watchlists for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "watchlists_delete_own" on public.watchlists;
create policy "watchlists_delete_own"
  on public.watchlists for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.paper_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  probability numeric(5, 4) check (probability >= 0 and probability <= 1),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, market_id)
);

alter table public.paper_predictions enable row level security;

drop trigger if exists paper_predictions_set_updated_at on public.paper_predictions;
create trigger paper_predictions_set_updated_at
  before update on public.paper_predictions
  for each row execute function public.set_updated_at();

create index if not exists paper_predictions_user_created_idx on public.paper_predictions (user_id, created_at desc);

drop policy if exists "paper_predictions_select_own" on public.paper_predictions;
create policy "paper_predictions_select_own"
  on public.paper_predictions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "paper_predictions_insert_own" on public.paper_predictions;
create policy "paper_predictions_insert_own"
  on public.paper_predictions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "paper_predictions_update_own_unresolved" on public.paper_predictions;
create policy "paper_predictions_update_own_unresolved"
  on public.paper_predictions for update
  to authenticated
  using (auth.uid() = user_id and resolved = false)
  with check (auth.uid() = user_id);

-- Trusted writes should come from Cloudflare Worker / Supabase service role only.
