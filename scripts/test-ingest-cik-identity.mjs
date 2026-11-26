#!/usr/bin/env node
/**
 * ingest_legal_records must keep two filers with the same name and different
 * SEC CIKs on separate entities, and still merge a repeated no-CIK name.
 */
import { execFileSync } from 'node:child_process'
import { chmodSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migration = path.join(
  root,
  'supabase/migrations/20261126120000_distinct_entities_per_cik.sql',
)

const sql = `
create schema if not exists extensions;

create or replace function public.normalize_entity_name(input text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(regexp_replace(coalesce(input, ''), '\\s+', ' ', 'g'))), '');
$$;

create or replace function public.json_text_as_int(input text, fallback integer)
returns integer
language plpgsql
immutable
as $$
declare
  n numeric;
begin
  if input is null or btrim(input) = '' then
    return fallback;
  end if;
  begin
    n := input::numeric;
  exception when others then
    return fallback;
  end;
  return round(n)::integer;
end;
$$;

create table public.source_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text,
  jurisdiction text,
  record_type text,
  access_method text,
  terms_status text,
  refresh_cadence text,
  source_url text,
  enabled boolean,
  notes text,
  last_success_at timestamptz,
  adapter_kind text,
  rate_limit_per_hour integer,
  auth_env_var text,
  terms_reviewed_at timestamptz,
  disabled_reason text,
  config jsonb,
  updated_at timestamptz
);

create table public.raw_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid,
  source_record_id text,
  payload_hash text,
  fetched_url text,
  source_timestamp timestamptz,
  retrieved_at timestamptz,
  normalized_status text,
  payload jsonb,
  unique (source_id, source_record_id)
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  canonical_name text,
  normalized_name text,
  entity_type text,
  jurisdiction text,
  status text,
  cik text,
  updated_at timestamptz default now()
);

create table public.entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  alias text,
  alias_type text,
  confidence integer,
  normalized_alias text,
  source text
);
create unique index entity_aliases_normalized_uidx
  on public.entity_aliases (normalized_alias)
  where normalized_alias is not null and normalized_alias <> '';

create table public.legal_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  source_id uuid,
  raw_record_id uuid,
  event_type text,
  title text,
  summary text,
  jurisdiction text,
  filing_date date,
  trade_date date,
  amount numeric,
  severity integer,
  confidence numeric,
  status text,
  allegation_disclaimer text,
  updated_at timestamptz
);

create table public.event_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  source_url text,
  document_id text,
  evidence_type text,
  metadata jsonb
);

create table public.friction_scores (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid unique,
  score integer,
  confidence integer,
  trend text,
  reasons jsonb,
  category_scores jsonb,
  model_version text,
  computed_at timestamptz
);

create table public.friction_score_history (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  score integer,
  confidence integer,
  trend text,
  reasons jsonb,
  category_scores jsonb,
  model_version text,
  computed_at timestamptz,
  recorded_at timestamptz default now()
);

\\ir ${migration.replaceAll('\\', '/')}

create or replace function public._ingest_one(
  record_id text,
  entity_name text,
  owner_cik text,
  issuer_cik text
) returns jsonb
language plpgsql
as $$
declare
  source jsonb := jsonb_build_object(
    'slug', 'sec-form4-test',
    'name', 'SEC Form 4',
    'jurisdiction', 'US-SEC',
    'record_type', 'form_4',
    'access_method', 'https',
    'terms_status', 'reviewed'
  );
  records jsonb;
begin
  records := jsonb_build_array(jsonb_build_object(
    'raw', jsonb_build_object(
      'source_record_id', record_id,
      'payload_hash', 'hash-' || record_id,
      'payload', '{}'::jsonb
    ),
    'event', jsonb_strip_nulls(jsonb_build_object(
      'entity_name', entity_name,
      'owner_cik', owner_cik,
      'issuer_cik', issuer_cik,
      'event_type', 'form_4',
      'title', 'Form 4 insider filing: ' || entity_name,
      'filing_date', '2026-11-01',
      'severity', '40',
      'confidence', '80'
    ))
  ));
  return public.ingest_legal_records(source, records);
end;
$$;

select public._ingest_one('smith-a', 'SMITH JOHN', '0001111111', null);
select public._ingest_one('smith-b', 'SMITH JOHN', '0002222222', null);
select public._ingest_one('smith-a-again', 'SMITH JOHN', '1111111', null);
select public._ingest_one('acme-1', 'ACME WIDGETS LLC', null, null);
select public._ingest_one('acme-2', 'ACME WIDGETS LLC', null, null);

do $$
declare
  smith_entities integer;
  smith_a_events integer;
  smith_b_events integer;
  acme_entities integer;
  acme_events integer;
begin
  select count(*) into smith_entities
  from public.entities
  where canonical_name = 'SMITH JOHN';
  if smith_entities <> 2 then
    raise exception 'expected 2 SMITH JOHN entities, found %', smith_entities;
  end if;

  select count(*) into smith_a_events
  from public.legal_events le
  join public.entities e on e.id = le.entity_id
  where e.canonical_name = 'SMITH JOHN'
    and nullif(regexp_replace(e.cik, '^0+', ''), '') = '1111111';
  if smith_a_events <> 2 then
    raise exception 'padded and unpadded CIK 1111111 should share one entity with 2 events, found %', smith_a_events;
  end if;

  select count(*) into smith_b_events
  from public.legal_events le
  join public.entities e on e.id = le.entity_id
  where e.canonical_name = 'SMITH JOHN'
    and nullif(regexp_replace(e.cik, '^0+', ''), '') = '2222222';
  if smith_b_events <> 1 then
    raise exception 'CIK 2222222 should have its own event, found %', smith_b_events;
  end if;

  select count(*) into acme_entities
  from public.entities
  where canonical_name = 'ACME WIDGETS LLC';
  select count(*) into acme_events
  from public.legal_events le
  join public.entities e on e.id = le.entity_id
  where e.canonical_name = 'ACME WIDGETS LLC';
  if acme_entities <> 1 or acme_events <> 2 then
    raise exception 'no-CIK name should still merge, entities=% events=%', acme_entities, acme_events;
  end if;
end $$;
`

const file = '/tmp/vortx-cik-identity.sql'
writeFileSync(file, sql)
chmodSync(file, 0o644)

execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'drop database if exists vortx_cik_test;'], {
  stdio: 'inherit',
})
execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'create database vortx_cik_test;'], {
  stdio: 'inherit',
})
execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', 'vortx_cik_test', '-v', 'ON_ERROR_STOP=1', '-f', file], {
  stdio: 'inherit',
})
console.log('ok distinct entities per cik')
