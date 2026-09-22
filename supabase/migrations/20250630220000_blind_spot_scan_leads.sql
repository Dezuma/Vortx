-- Extend sales_leads.use_case for blind spot scanner (run in Supabase SQL editor when ready).
alter table public.sales_leads drop constraint if exists sales_leads_use_case_check;

alter table public.sales_leads add constraint sales_leads_use_case_check check (
  use_case = any (
    array[
      'investors'::text,
      'smb'::text,
      'journalism'::text,
      'real_estate'::text,
      'legal_ops'::text,
      'hr_workforce'::text,
      'credit'::text,
      'litigation'::text,
      'collections'::text,
      'competitive'::text,
      'other'::text,
      'blind_spot_scan'::text
    ]
  )
);

-- Future: entity-linked subscriber watchlists (current watchlists table is legacy market_id schema).
create table if not exists public.entity_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  entity_ids uuid[] not null default '{}',
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entity_watchlists_user_id_idx on public.entity_watchlists (user_id);
