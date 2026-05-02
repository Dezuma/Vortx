-- Safe to rerun: updates initial live markets by slug.

insert into public.markets (slug, title, description, yes_price, outcome, source_url)
values
  ('fed-cut-q3', 'Fed cuts >=25bp before Oct 1?', 'Macro contract example', 0.42, 'open', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'),
  ('mega-cap-ma', 'Top-5 tech M&A rumor confirmed?', 'Two tier-1 wires required', 0.18, 'open', 'https://www.sec.gov/edgar/search/'),
  ('iphone-button', 'Next iPhone Action button variant?', 'Product event contract', 0.67, 'open', 'https://www.apple.com/newsroom/')
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  yes_price = excluded.yes_price,
  outcome = excluded.outcome,
  source_url = excluded.source_url,
  updated_at = now();
