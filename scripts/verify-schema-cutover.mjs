#!/usr/bin/env node
/** Reliability checks for the schema DE cutover (idempotent ingest, scores, retention). */
import { connectSupabasePg } from './lib/supabase-pg.mjs'

let failed = 0
function check(label, ok, detail = '') {
  if (ok) console.log(`ok ${label}${detail ? ` (${detail})` : ''}`)
  else {
    failed += 1
    console.error(`fail ${label}${detail ? `: ${detail}` : ''}`)
  }
}

const { sql, host } = await connectSupabasePg()
console.log(`verify via ${host}`)

try {
  const counts = (
    await sql`
      select
        (select count(*)::int from raw_records) as raw,
        (select count(*)::int from legal_events) as events,
        (select count(*)::int from friction_scores) as scores,
        (select count(distinct entity_id)::int from friction_scores) as score_entities,
        (select count(*)::int from friction_score_history) as history
    `
  )[0]

  check('friction_scores one row per entity', counts.scores === counts.score_entities, `${counts.scores}/${counts.score_entities}`)
  check(
    'no raw source-record duplicates',
    (
      await sql`
        select count(*)::int as n from (
          select source_id, source_record_id from raw_records group by 1,2 having count(*)>1
        ) t
      `
    )[0].n === 0,
  )
  check(
    'required unique indexes exist',
    (
      await sql`
        select count(*)::int as n from pg_indexes
        where indexname in (
          'raw_records_source_record_uidx',
          'friction_scores_entity_uidx',
          'entity_aliases_normalized_uidx'
        )
      `
    )[0].n === 3,
  )
  check(
    'normalized_name populated',
    (
      await sql`
        select count(*)::int as n from entities
        where normalized_name is null or normalized_name = ''
      `
    )[0].n === 0,
  )
  check(
    'watchlist members backfilled',
    (
      await sql`
        select count(*)::int as n from entity_watchlists w
        where coalesce(cardinality(w.entity_ids), 0) > 0
          and not exists (
            select 1 from entity_watchlist_members m where m.watchlist_id = w.id
          )
      `
    )[0].n === 0,
  )

  const [sample] = await sql`
    select
      sc.slug, sc.name, sc.jurisdiction, sc.record_type, sc.access_method, sc.terms_status,
      sc.refresh_cadence, sc.source_url, sc.enabled, sc.notes, sc.adapter_kind,
      sc.rate_limit_per_hour, sc.auth_env_var, sc.terms_reviewed_at, sc.disabled_reason, sc.config,
      r.source_record_id, r.payload_hash, r.fetched_url, r.payload, r.id as raw_id,
      e.id as event_id, e.event_type, e.title, e.summary, e.jurisdiction as ej, e.filing_date,
      e.amount, e.severity, e.confidence, e.status, ent.canonical_name as entity_name
    from legal_events e
    join raw_records r on r.id = e.raw_record_id
    join source_catalog sc on sc.id = e.source_id
    join entities ent on ent.id = e.entity_id
    order by e.updated_at desc nulls last
    limit 1
  `
  check('sample event available for idempotency test', Boolean(sample))

  if (sample) {
    const beforeEvents = (await sql`select count(*)::int as n from legal_events`)[0].n
    const beforeRaw = (await sql`select count(*)::int as n from raw_records`)[0].n

    const source = {
      slug: sample.slug,
      name: sample.name,
      jurisdiction: sample.jurisdiction,
      record_type: sample.record_type,
      access_method: sample.access_method,
      terms_status: sample.terms_status,
      refresh_cadence: sample.refresh_cadence || 'daily',
      source_url: sample.source_url,
      enabled: sample.enabled,
      notes: sample.notes,
      last_success_at: new Date().toISOString(),
      adapter_kind: sample.adapter_kind || 'manual',
      rate_limit_per_hour: sample.rate_limit_per_hour || 60,
      auth_env_var: sample.auth_env_var || '',
      terms_reviewed_at: sample.terms_reviewed_at || new Date().toISOString(),
      disabled_reason: sample.disabled_reason || '',
      config: sample.config || {},
    }
    const records = [
      {
        raw: {
          source_record_id: sample.source_record_id,
          payload_hash: sample.payload_hash,
          fetched_url: sample.fetched_url,
          source_timestamp: new Date().toISOString(),
          retrieved_at: new Date().toISOString(),
          payload: sample.payload || {},
        },
        event: {
          entity_name: sample.entity_name,
          event_type: sample.event_type,
          title: sample.title,
          summary: sample.summary,
          jurisdiction: sample.ej,
          filing_date: sample.filing_date,
          amount: sample.amount == null ? '' : String(sample.amount),
          severity: sample.severity,
          confidence: sample.confidence, // may be 86.00 style numeric
          status: sample.status,
        },
      },
    ]

    const same = (
      await sql`select public.ingest_legal_records(${sql.json(source)}::jsonb, ${sql.json(records)}::jsonb) as r`
    )[0].r
    const afterSameEvents = (await sql`select count(*)::int as n from legal_events`)[0].n
    const afterSameRaw = (await sql`select count(*)::int as n from raw_records`)[0].n
    check('reingest same record does not create rows', afterSameEvents === beforeEvents && afterSameRaw === beforeRaw, JSON.stringify(same))
    check('reingest reports updated or zero insert', Number(same.inserted || 0) === 0 && Number(same.errors || 0) === 0, JSON.stringify(same))

    const bumped = structuredClone(records)
    bumped[0].raw.payload_hash = `${sample.payload_hash}-verify-bump`
    bumped[0].event.severity = Math.min(100, Number(sample.severity || 50) + 1)
    bumped[0].event.confidence = '86.00'
    const changed = (
      await sql`select public.ingest_legal_records(${sql.json(source)}::jsonb, ${sql.json(bumped)}::jsonb) as r`
    )[0].r
    const afterChangedEvents = (await sql`select count(*)::int as n from legal_events`)[0].n
    const [ev] = await sql`select severity from legal_events where id = ${sample.event_id}`
    check('payload change updates in place (no new event)', afterChangedEvents === beforeEvents, JSON.stringify(changed))
    check('severity updated on reingest', Number(ev.severity) === Number(bumped[0].event.severity), `got ${ev.severity}`)

    // restore
    await sql`select public.ingest_legal_records(${sql.json(source)}::jsonb, ${sql.json(records)}::jsonb)`
  }

  const ret = (await sql`select public.run_data_retention() as r`)[0].r
  check('retention rpc ok', Boolean(ret?.ok), JSON.stringify(ret))

  check('json_text_as_int handles decimals', (await sql`select public.json_text_as_int('86.00', 80) as n`)[0].n === 86)
} finally {
  await sql.end({ timeout: 2 }).catch(() => undefined)
}

if (failed) {
  console.error(`\n${failed} verification check(s) failed`)
  process.exit(1)
}
console.log('\nAll schema cutover reliability checks passed.')
