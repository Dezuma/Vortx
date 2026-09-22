-- AI-drafted case stories with mandatory human approval gate.
-- status flow: pending_review -> published | rejected. No auto-publish path.
create table if not exists public.case_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'published', 'rejected')),
  headline text not null,
  dek text,
  body text not null,
  video_script text,
  record_type text,
  event_id uuid references public.legal_events (id),
  entity_id uuid,
  source_fields jsonb not null default '{}'::jsonb,
  model text,
  generation_notes jsonb not null default '[]'::jsonb,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists case_stories_status_idx
  on public.case_stories (status, created_at desc);

create index if not exists case_stories_event_idx
  on public.case_stories (event_id);

-- Service-role only. No anon/authenticated policies: the Worker SSR layer
-- reads published rows with the service key and gates admin actions itself.
alter table public.case_stories enable row level security;

revoke all on public.case_stories from anon, authenticated;
