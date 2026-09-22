-- Passkey credentials and hashed recovery codes. Service-role only.
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  challenge text not null,
  purpose text not null check (purpose in ('register', 'authenticate')),
  user_verification text not null default 'preferred',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key jsonb not null,
  sign_count bigint not null default 0,
  device_type text check (device_type in ('singleDevice', 'multiDevice')),
  backed_up boolean not null default false,
  transports text[] not null default '{}',
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists webauthn_challenges_expires_idx
  on public.webauthn_challenges (expires_at);
create index if not exists webauthn_credentials_user_idx
  on public.webauthn_credentials (user_id);
create index if not exists recovery_codes_user_idx
  on public.recovery_codes (user_id);

alter table public.webauthn_challenges enable row level security;
alter table public.webauthn_credentials enable row level security;
alter table public.recovery_codes enable row level security;

revoke all on table public.webauthn_challenges from anon, authenticated;
revoke all on table public.webauthn_credentials from anon, authenticated;
revoke all on table public.recovery_codes from anon, authenticated;
