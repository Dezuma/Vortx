-- Optional: upsert Scout and Sentinel entitlements in Supabase.
-- Run in SQL editor if entitlements table exists without these rows.

insert into entitlements (plan, label, monthly_price, watchlist_limit, alert_limit)
values
  ('scout', 'Scout', '$20/month', 1, 2),
  ('sentinel', 'Sentinel', '$50/month', 3, 5)
on conflict (plan) do update set
  label = excluded.label,
  monthly_price = excluded.monthly_price,
  watchlist_limit = excluded.watchlist_limit,
  alert_limit = excluded.alert_limit;
