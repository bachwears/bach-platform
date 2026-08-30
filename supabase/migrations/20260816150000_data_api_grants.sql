-- Production disables automatic Data API exposure (deliberate: §project setup).
-- Every table must be granted explicitly here; RLS policies then restrict rows.
-- Pattern for future migrations: create table -> enable RLS -> policies -> grants.

grant usage on schema public to anon, authenticated, service_role;

-- service_role is server-side only (Edge Functions, seeds, admin scripts).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Storefront visitors: only the payment methods list (RLS filters to enabled).
grant select on public.payment_methods to anon;

-- Staff: table-level access; row-level rules live in the RLS policies.
grant select on public.branches to authenticated;
grant select on public.profiles to authenticated;
grant select on public.exchange_rates to authenticated;
grant select on public.tva_settings to authenticated;
grant select on public.payment_methods to authenticated;

grant insert on public.exchange_rates to authenticated;
grant update on public.tva_settings to authenticated;
grant insert, update, delete on public.branches to authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.payment_methods to authenticated;
