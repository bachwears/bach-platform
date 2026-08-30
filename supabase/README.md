# Supabase

- **Production**: single Supabase Pro project (`eu-central-1`). Spend-capped.
- **Dev/staging**: `supabase start` (local Docker stack) — no second cloud project.
- **Migrations**: live in `supabase/migrations/`, applied to prod via CI (`supabase db push`). Never edit prod schema through the dashboard.
- **Backups**: Supabase daily (7-day retention) + nightly `pg_dump` cron on the VPS (30-day rotation). No PITR add-on by decision.

Keys: URL + anon key are public-safe (RLS is the enforcement layer). `service_role` key and DB password are secrets — GitHub Actions secrets / server env only.
