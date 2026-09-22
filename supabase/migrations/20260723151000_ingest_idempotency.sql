-- Make raw_records idempotent on (source_id, source_record_id).
begin;

create temporary table _raw_keepers as
select distinct on (source_id, source_record_id)
  id as keep_raw_id,
  source_id,
  source_record_id
from public.raw_records
order by source_id, source_record_id, retrieved_at desc nulls last, id desc;

create temporary table _raw_dupes as
select r.id as dupe_raw_id, k.keep_raw_id
from public.raw_records r
join _raw_keepers k
  on k.source_id = r.source_id
 and k.source_record_id = r.source_record_id
where r.id <> k.keep_raw_id;

create temporary table _event_keepers as
select distinct on (r.source_id, r.source_record_id)
  e.id as keep_event_id,
  k.keep_raw_id,
  r.source_id,
  r.source_record_id
from public.legal_events e
join public.raw_records r on r.id = e.raw_record_id
join _raw_keepers k
  on k.source_id = r.source_id
 and k.source_record_id = r.source_record_id
order by r.source_id, r.source_record_id, e.updated_at desc nulls last, e.created_at desc nulls last, e.id desc;

update public.legal_events e
set raw_record_id = ek.keep_raw_id,
    updated_at = now()
from _event_keepers ek
where e.id = ek.keep_event_id
  and e.raw_record_id is distinct from ek.keep_raw_id;

delete from public.event_evidence ee
using public.legal_events e
join public.raw_records r on r.id = e.raw_record_id
join _raw_keepers k
  on k.source_id = r.source_id
 and k.source_record_id = r.source_record_id
left join _event_keepers ek on ek.keep_event_id = e.id
where ee.event_id = e.id
  and ek.keep_event_id is null;

update public.case_stories cs
set event_id = null
where exists (
  select 1
  from public.legal_events e
  join public.raw_records r on r.id = e.raw_record_id
  join _raw_keepers k
    on k.source_id = r.source_id
   and k.source_record_id = r.source_record_id
  left join _event_keepers ek on ek.keep_event_id = e.id
  where cs.event_id = e.id
    and ek.keep_event_id is null
);

delete from public.legal_events e
where exists (
  select 1
  from public.raw_records r
  join _raw_keepers k
    on k.source_id = r.source_id
   and k.source_record_id = r.source_record_id
  left join _event_keepers ek on ek.keep_event_id = e.id
  where e.raw_record_id = r.id
    and ek.keep_event_id is null
);

delete from public.raw_records r
using _raw_dupes d
where r.id = d.dupe_raw_id;

create unique index if not exists raw_records_source_record_uidx
  on public.raw_records (source_id, source_record_id);

commit;
