-- Persist mainstream coverage timestamps for "you were early" badges.
create table if not exists public.event_news_coverage (
  event_id uuid primary key references public.legal_events(id) on delete cascade,
  detected_at timestamptz not null,
  news_mentioned_at timestamptz not null,
  coverage_source text not null default 'rss',
  coverage_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_news_coverage_order_check check (news_mentioned_at > detected_at)
);

create index if not exists event_news_coverage_news_mentioned_idx
  on public.event_news_coverage (news_mentioned_at desc);

comment on table public.event_news_coverage is
  'Filing detection vs first filing-relevant mainstream news mention for early badges.';

alter table public.event_news_coverage enable row level security;
