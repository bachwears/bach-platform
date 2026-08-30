# Supabase

- **Production**: single Supabase Pro project (`eu-central-1`). Spend-capped.
- **Dev/staging**: `supabase start` (local Docker stack) — no second cloud project.
- **Migrations**: live in `supabase/migrations/`, applied to prod via CI (`supabase db push`). Never edit prod schema through the dashboard.
- **Backups**: Supabase daily (7-day retention) + nightly `pg_dump` cron on the VPS (30-day rotation). No PITR add-on by decision.

Keys: URL + anon key are public-safe (RLS is the enforcement layer). `service_role` key and DB password are secrets — GitHub Actions secrets / server env only.

## Staff seeding

Six role accounts (`superadmin@` / `storemanager@` / `inventorymanager@` / `cashier@` / `supportagent@` / `marketing@` `bachwears.com`) are created by `scripts/seed-staff.ts` with a temporary password and `must_change_password = true` (enforced at login by the apps). Run per environment:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_TEMP_PASSWORD=... pnpm tsx scripts/seed-staff.ts
```

The temp password is never stored in this repo — pass it via env each time.
