-- Safe to rerun: updates existing demo markets by slug.

insert into public.markets (slug, title, description, yes_price, outcome)
values
  ('fed-cut-q3', 'Fed cuts >=25bp before Oct 1?', 'Macro contract example', 0.42, 'open'),
  ('mega-cap-ma', 'Top-5 tech M&A rumor confirmed?', 'Two tier-1 wires required', 0.18, 'open'),
  ('iphone-button', 'Next iPhone Action button variant?', 'Product event contract', 0.67, 'open')
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  yes_price = excluded.yes_price,
  outcome = excluded.outcome,
  updated_at = now();
