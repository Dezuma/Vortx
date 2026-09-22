-- API key hashes are Worker/service-role data only.
alter table public.api_subscribers enable row level security;
revoke all on table public.api_subscribers from anon;
revoke all on table public.api_subscribers from authenticated;
