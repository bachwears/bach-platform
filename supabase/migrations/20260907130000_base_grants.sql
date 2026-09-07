-- CRITICAL launch fix, found in live prod audit 2026-09-07.
--
-- The prod project (created 2026-08) ships hardened defaults: tables created
-- by migrations get NO grants for anon/authenticated. 31 tables were fully
-- unreadable (customers couldn't see their own orders/wishlist; POS/MGMT
-- direct table reads 42501'd for staff). Local dev masked all of it because
-- the CLI stack still grants broadly by default.
--
-- Standard Supabase posture: broad GRANTs, with RLS as the actual gate.
-- Every public table here has RLS enabled with explicit policies.

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Future tables/sequences from migrations inherit the same posture.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
