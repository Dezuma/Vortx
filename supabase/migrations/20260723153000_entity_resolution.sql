-- Entity resolution helpers: normalized_name + extend existing entity_aliases.

alter table public.entities
  add column if not exists normalized_name text;

update public.entities
set normalized_name = lower(trim(regexp_replace(coalesce(canonical_name, ''), '\s+', ' ', 'g')))
where normalized_name is null
   or normalized_name = '';

create index if not exists entities_normalized_name_idx
  on public.entities (normalized_name);

create index if not exists entities_normalized_name_trgm_idx
  on public.entities using gin (normalized_name gin_trgm_ops);

-- Live DB already had entity_aliases(entity_id, alias, alias_type, confidence).
-- Add normalized_alias for ingest match without dropping legacy columns.
alter table public.entity_aliases
  add column if not exists normalized_alias text;

alter table public.entity_aliases
  add column if not exists source text;

update public.entity_aliases
set source = coalesce(nullif(source, ''), alias_type, 'legacy')
where source is null or source = '';

update public.entity_aliases
set normalized_alias = lower(trim(regexp_replace(coalesce(alias, ''), '\s+', ' ', 'g')))
where normalized_alias is null or normalized_alias = '';

-- Deduplicate normalized_alias before unique index (keep lowest id).
delete from public.entity_aliases a
using public.entity_aliases b
where a.normalized_alias is not null
  and a.normalized_alias = b.normalized_alias
  and a.id > b.id;

create unique index if not exists entity_aliases_normalized_uidx
  on public.entity_aliases (normalized_alias)
  where normalized_alias is not null and normalized_alias <> '';

create index if not exists entity_aliases_entity_id_idx
  on public.entity_aliases (entity_id);

alter table public.entity_aliases enable row level security;

revoke all on table public.entity_aliases from anon, authenticated;
grant all on table public.entity_aliases to service_role;
