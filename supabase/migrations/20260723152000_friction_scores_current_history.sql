-- Split friction_scores into current (1 row / entity) + append-only history.
begin;

create table if not exists public.friction_score_history (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  score integer not null,
  confidence integer not null,
  trend text,
  reasons jsonb not null default '[]'::jsonb,
  category_scores jsonb not null default '{}'::jsonb,
  model_version text,
  computed_at timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);

create index if not exists friction_score_history_entity_time_idx
  on public.friction_score_history (entity_id, computed_at desc);

-- Copy existing snapshots into history (idempotent by skipping if history already populated).
insert into public.friction_score_history (
  entity_id, score, confidence, trend, reasons, category_scores, model_version, computed_at, recorded_at
)
select
  fs.entity_id,
  fs.score,
  fs.confidence,
  fs.trend,
  coalesce(fs.reasons, '[]'::jsonb),
  coalesce(fs.category_scores, '{}'::jsonb),
  fs.model_version,
  coalesce(fs.computed_at, now()),
  now()
from public.friction_scores fs
where not exists (select 1 from public.friction_score_history limit 1);

-- Rebuild current table as one row per entity.
create temporary table _friction_current as
select distinct on (entity_id)
  id, entity_id, score, confidence, trend, reasons, category_scores, model_version, computed_at
from public.friction_scores
order by entity_id, computed_at desc nulls last, id desc;

truncate public.friction_scores;

insert into public.friction_scores (
  id, entity_id, score, confidence, trend, reasons, category_scores, model_version, computed_at
)
select id, entity_id, score, confidence, trend, reasons, category_scores, model_version, computed_at
from _friction_current;

create unique index if not exists friction_scores_entity_uidx
  on public.friction_scores (entity_id);

commit;
