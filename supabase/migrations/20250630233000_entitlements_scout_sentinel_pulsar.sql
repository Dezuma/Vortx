-- Extend entitlements.plan for Scout/Sentinel/Pulsar tiers (service_requests FK).
alter table public.entitlements drop constraint if exists entitlements_plan_check;

alter table public.entitlements add constraint entitlements_plan_check check (
  plan = any (
    array[
      'nebula'::text,
      'supernova'::text,
      'galactic'::text,
      'custom'::text,
      'scout'::text,
      'sentinel'::text,
      'pulsar'::text
    ]
  )
);

insert into public.entitlements (plan, label, monthly_price, watchlist_limit, alert_limit)
values
  ('scout', 'Scout', '$20/month', 1, 2),
  ('sentinel', 'Sentinel', '$50/month', 3, 5),
  ('pulsar', 'Pulsar', '$99/month', 12, 40)
on conflict (plan) do update set
  label = excluded.label,
  monthly_price = excluded.monthly_price,
  watchlist_limit = excluded.watchlist_limit,
  alert_limit = excluded.alert_limit;
