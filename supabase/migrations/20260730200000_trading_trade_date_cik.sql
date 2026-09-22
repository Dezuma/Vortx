-- Trading data engineering: trade_date grain, CIK entity keys, honest source success stamps.

alter table public.legal_events
  add column if not exists trade_date date;

create index if not exists legal_events_trade_date_idx
  on public.legal_events (trade_date desc nulls last);

comment on column public.legal_events.trade_date is
  'Transaction date when sourced (Form 4 ownership XML / PTR transaction). Distinct from filing_date (acceptance/disclosure).';

alter table public.entities
  add column if not exists cik text;

create unique index if not exists entities_cik_uidx
  on public.entities (cik)
  where cik is not null and cik <> '';

create index if not exists entities_cik_idx
  on public.entities (cik)
  where cik is not null;

comment on column public.entities.cik is
  'SEC Central Index Key when known. Preferred entity key over fragile name strings.';

-- Keep ingest_rpc.sql as source of truth; re-apply full function below.
create or replace function public.ingest_legal_records(source jsonb, records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  source_uuid uuid;
  raw_uuid uuid;
  entity_uuid uuid;
  event_uuid uuid;
  item jsonb;
  raw_payload jsonb;
  event_payload jsonb;
  inserted_count integer := 0;
  skipped_count integer := 0;
  updated_count integer := 0;
  error_count integer := 0;
  entity_name text;
  normalized text;
  score_value integer;
  confidence_value integer;
  source_record_key text;
  incoming_hash text;
  item_error text;
  owner_cik text;
  issuer_cik text;
  entity_cik text;
begin
  insert into public.source_catalog (
    slug,
    name,
    jurisdiction,
    record_type,
    access_method,
    terms_status,
    refresh_cadence,
    source_url,
    enabled,
    notes,
    last_success_at,
    adapter_kind,
    rate_limit_per_hour,
    auth_env_var,
    terms_reviewed_at,
    disabled_reason,
    config
  )
  values (
    source->>'slug',
    source->>'name',
    source->>'jurisdiction',
    source->>'record_type',
    source->>'access_method',
    source->>'terms_status',
    coalesce(source->>'refresh_cadence', 'daily'),
    source->>'source_url',
    coalesce((source->>'enabled')::boolean, true),
    source->>'notes',
    nullif(source->>'last_success_at', '')::timestamptz,
    coalesce(source->>'adapter_kind', 'manual'),
    coalesce((source->>'rate_limit_per_hour')::integer, 60),
    nullif(source->>'auth_env_var', ''),
    coalesce((source->>'terms_reviewed_at')::timestamptz, now()),
    nullif(source->>'disabled_reason', ''),
    coalesce(source->'config', '{}'::jsonb)
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    jurisdiction = excluded.jurisdiction,
    record_type = excluded.record_type,
    access_method = excluded.access_method,
    terms_status = excluded.terms_status,
    refresh_cadence = excluded.refresh_cadence,
    source_url = excluded.source_url,
    enabled = excluded.enabled,
    notes = excluded.notes,
    -- Preserve prior success when this run did not land rows.
    last_success_at = coalesce(excluded.last_success_at, source_catalog.last_success_at),
    adapter_kind = excluded.adapter_kind,
    rate_limit_per_hour = excluded.rate_limit_per_hour,
    auth_env_var = excluded.auth_env_var,
    terms_reviewed_at = excluded.terms_reviewed_at,
    disabled_reason = excluded.disabled_reason,
    config = excluded.config,
    updated_at = now()
  returning id into source_uuid;

  for item in select * from jsonb_array_elements(coalesce(records, '[]'::jsonb))
  loop
    begin
      raw_payload := item->'raw';
      event_payload := item->'event';
      source_record_key := nullif(trim(raw_payload->>'source_record_id'), '');
      incoming_hash := nullif(trim(raw_payload->>'payload_hash'), '');

      if source_record_key is null or incoming_hash is null then
        skipped_count := skipped_count + 1;
        continue;
      end if;

      insert into public.raw_records (
        source_id,
        source_record_id,
        payload_hash,
        fetched_url,
        source_timestamp,
        retrieved_at,
        normalized_status,
        payload
      )
      values (
        source_uuid,
        source_record_key,
        incoming_hash,
        raw_payload->>'fetched_url',
        coalesce((raw_payload->>'source_timestamp')::timestamptz, now()),
        coalesce((raw_payload->>'retrieved_at')::timestamptz, now()),
        'normalized',
        coalesce(raw_payload->'payload', '{}'::jsonb)
      )
      on conflict (source_id, source_record_id) do update
      set
        payload_hash = case
          when excluded.payload_hash is not distinct from raw_records.payload_hash then raw_records.payload_hash
          when not exists (
            select 1 from public.raw_records x
            where x.payload_hash = excluded.payload_hash
              and x.id <> raw_records.id
          ) then excluded.payload_hash
          else raw_records.payload_hash
        end,
        fetched_url = excluded.fetched_url,
        source_timestamp = excluded.source_timestamp,
        retrieved_at = excluded.retrieved_at,
        normalized_status = 'normalized',
        payload = excluded.payload
      returning id into raw_uuid;

      select id into event_uuid
      from public.legal_events
      where raw_record_id = raw_uuid
      limit 1;

      entity_name := nullif(trim(event_payload->>'entity_name'), '');
      normalized := public.normalize_entity_name(entity_name);
      owner_cik := nullif(regexp_replace(coalesce(event_payload->>'owner_cik', ''), '[^0-9]', '', 'g'), '');
      issuer_cik := nullif(regexp_replace(coalesce(event_payload->>'issuer_cik', ''), '[^0-9]', '', 'g'), '');
      entity_cik := coalesce(owner_cik, issuer_cik);

      if entity_name is null then
        skipped_count := skipped_count + 1;
        event_uuid := null;
        entity_uuid := null;
        continue;
      end if;

      entity_uuid := null;

      -- Prefer CIK identity over fragile name strings.
      if entity_cik is not null then
        select id into entity_uuid
        from public.entities
        where cik = entity_cik
        limit 1;

        -- CIK identity lives on entities.cik (alias_type check may not allow 'cik').
      end if;

      if entity_uuid is null then
        select ea.entity_id into entity_uuid
        from public.entity_aliases ea
        where ea.normalized_alias = normalized
        limit 1;
      end if;

      if entity_uuid is null then
        select id into entity_uuid
        from public.entities
        where normalized_name = normalized
        order by updated_at desc nulls last
        limit 1;
      end if;

      if entity_uuid is null then
        select id into entity_uuid
        from public.entities
        where canonical_name = entity_name
        limit 1;
      end if;

      if entity_uuid is null then
        insert into public.entities (
          canonical_name,
          normalized_name,
          entity_type,
          jurisdiction,
          status,
          cik
        )
        values (
          entity_name,
          normalized,
          'company',
          event_payload->>'jurisdiction',
          'unknown',
          entity_cik
        )
        returning id into entity_uuid;
      else
        update public.entities
        set
          normalized_name = coalesce(nullif(normalized_name, ''), normalized),
          cik = coalesce(nullif(cik, ''), entity_cik),
          updated_at = now()
        where id = entity_uuid
          and (
            normalized_name is null or normalized_name = ''
            or (entity_cik is not null and (cik is null or cik = ''))
          );
      end if;

      if normalized is not null and not exists (
        select 1 from public.entity_aliases ea where ea.normalized_alias = normalized
      ) then
        begin
          insert into public.entity_aliases (entity_id, alias, alias_type, confidence, normalized_alias, source)
          values (entity_uuid, entity_name, 'name', 90, normalized, coalesce(source->>'slug', 'ingest'));
        exception when others then
          -- alias_type / uniqueness may reject; CIK + normalized_name match still works.
          null;
        end;
      end if;

      score_value := least(100, greatest(0, public.json_text_as_int(event_payload->>'severity', 50)));
      confidence_value := least(100, greatest(0, public.json_text_as_int(event_payload->>'confidence', 80)));

      if event_uuid is not null then
        update public.legal_events
        set
          entity_id = entity_uuid,
          event_type = coalesce(nullif(event_payload->>'event_type', ''), event_type),
          title = coalesce(nullif(event_payload->>'title', ''), title),
          summary = coalesce(nullif(event_payload->>'summary', ''), summary),
          jurisdiction = coalesce(nullif(event_payload->>'jurisdiction', ''), jurisdiction),
          filing_date = coalesce(nullif(event_payload->>'filing_date', '')::date, filing_date),
          trade_date = coalesce(nullif(event_payload->>'trade_date', '')::date, trade_date),
          amount = coalesce(nullif(event_payload->>'amount', '')::numeric, amount),
          severity = coalesce(public.json_text_as_int(event_payload->>'severity', null), severity),
          confidence = coalesce(nullif(event_payload->>'confidence', '')::numeric, confidence),
          status = coalesce(nullif(event_payload->>'status', ''), status),
          updated_at = now()
        where id = event_uuid;

        updated_count := updated_count + 1;
      else
        insert into public.legal_events (
          entity_id,
          source_id,
          raw_record_id,
          event_type,
          title,
          summary,
          jurisdiction,
          filing_date,
          trade_date,
          amount,
          severity,
          confidence,
          status,
          allegation_disclaimer
        )
        values (
          entity_uuid,
          source_uuid,
          raw_uuid,
          event_payload->>'event_type',
          event_payload->>'title',
          event_payload->>'summary',
          event_payload->>'jurisdiction',
          nullif(event_payload->>'filing_date', '')::date,
          nullif(event_payload->>'trade_date', '')::date,
          nullif(event_payload->>'amount', '')::numeric,
          score_value,
          confidence_value,
          coalesce(nullif(event_payload->>'status', ''), 'open'),
          'This record is an allegation or administrative filing, not a judgment.'
        )
        returning id into event_uuid;

        if nullif(event_payload->>'evidence_url', '') is not null then
          insert into public.event_evidence (
            event_id,
            source_url,
            document_id,
            evidence_type,
            metadata
          )
          values (
            event_uuid,
            event_payload->>'evidence_url',
            source_record_key,
            'source_link',
            jsonb_build_object(
              'source_slug', source->>'slug',
              'trade_date', event_payload->>'trade_date',
              'grain', event_payload->>'grain'
            )
          );
        end if;

        inserted_count := inserted_count + 1;
      end if;

      if not exists (
        select 1 from public.friction_scores fs
        where fs.entity_id = entity_uuid
          and fs.score = score_value
          and fs.confidence = confidence_value
      ) then
        insert into public.friction_score_history (
          entity_id, score, confidence, trend, reasons, category_scores, model_version, computed_at
        )
        values (
          entity_uuid,
          score_value,
          confidence_value,
          'flat',
          jsonb_build_array(jsonb_build_object('label', event_payload->>'title', 'weight', least(50, greatest(0, score_value / 2)))),
          jsonb_build_object(coalesce(event_payload->>'event_type', 'public_record'), score_value),
          'scheduled-ingest-v2',
          now()
        );
      end if;

      insert into public.friction_scores (
        entity_id,
        score,
        confidence,
        trend,
        reasons,
        category_scores,
        model_version,
        computed_at
      )
      values (
        entity_uuid,
        score_value,
        confidence_value,
        'flat',
        jsonb_build_array(jsonb_build_object('label', event_payload->>'title', 'weight', least(50, greatest(0, score_value / 2)))),
        jsonb_build_object(coalesce(event_payload->>'event_type', 'public_record'), score_value),
        'scheduled-ingest-v2',
        now()
      )
      on conflict (entity_id) do update
      set
        score = excluded.score,
        confidence = excluded.confidence,
        trend = excluded.trend,
        reasons = excluded.reasons,
        category_scores = excluded.category_scores,
        model_version = excluded.model_version,
        computed_at = excluded.computed_at;

      event_uuid := null;
      entity_uuid := null;
      raw_uuid := null;
    exception when others then
      error_count := error_count + 1;
      item_error := SQLERRM;
      raise warning 'ingest_legal_records item failed source=% record=% err=%',
        source->>'slug',
        coalesce(item->'raw'->>'source_record_id', '?'),
        item_error;
      event_uuid := null;
      entity_uuid := null;
      raw_uuid := null;
    end;
  end loop;

  return jsonb_build_object(
    'source', source->>'slug',
    'fetched', jsonb_array_length(coalesce(records, '[]'::jsonb)),
    'inserted', inserted_count,
    'updated', updated_count,
    'skipped', skipped_count,
    'errors', error_count,
    'last_error', item_error
  );
end;
$$;

revoke all on function public.ingest_legal_records(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_legal_records(jsonb, jsonb) to service_role;
