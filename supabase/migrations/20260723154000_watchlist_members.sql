-- Junction table for entity watchlists (entity_ids[] kept as denormalized cache).

create table if not exists public.entity_watchlist_members (
  watchlist_id uuid not null references public.entity_watchlists(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watchlist_id, entity_id)
);

create index if not exists entity_watchlist_members_entity_idx
  on public.entity_watchlist_members (entity_id);

create index if not exists entity_watchlist_members_watchlist_idx
  on public.entity_watchlist_members (watchlist_id);

-- Backfill from array column.
insert into public.entity_watchlist_members (watchlist_id, entity_id)
select w.id, unnest(w.entity_ids)
from public.entity_watchlists w
where coalesce(cardinality(w.entity_ids), 0) > 0
on conflict do nothing;

alter table public.entity_watchlist_members enable row level security;

drop policy if exists entity_watchlist_members_owner_select on public.entity_watchlist_members;
create policy entity_watchlist_members_owner_select
  on public.entity_watchlist_members
  for select
  using (
    exists (
      select 1 from public.entity_watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists entity_watchlist_members_owner_insert on public.entity_watchlist_members;
create policy entity_watchlist_members_owner_insert
  on public.entity_watchlist_members
  for insert
  with check (
    exists (
      select 1 from public.entity_watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists entity_watchlist_members_owner_update on public.entity_watchlist_members;
create policy entity_watchlist_members_owner_update
  on public.entity_watchlist_members
  for update
  using (
    exists (
      select 1 from public.entity_watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.entity_watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists entity_watchlist_members_owner_delete on public.entity_watchlist_members;
create policy entity_watchlist_members_owner_delete
  on public.entity_watchlist_members
  for delete
  using (
    exists (
      select 1 from public.entity_watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.entity_watchlist_members to authenticated;
grant all on table public.entity_watchlist_members to service_role;
