# BACH Wears Platform

Menswear commerce platform — Lebanon. Three connected apps, one brain.

| App | Domain | Language default | Port (dev) |
|---|---|---|---|
| Storefront | bachwears.com | EN (AR/RTL secondary) | 3000 |
| POS / Ops | pos.bachwears.com | AR (RTL) | 3001 |
| Management | mgmt.bachwears.com | AR (RTL) | 3002 |

## Stack

Turborepo · Next.js · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions) · Docker on VPS behind Caddy.

## Structure

```
apps/
  storefront/   customer-facing store (EN default, AR secondary)
  pos/          point of sale & fulfillment (AR-first)
  mgmt/         management portal (AR-first)
packages/
  ui/           shared shadcn-based components (BACH-themed, RTL, dark/light)
  types/        shared domain types (Money = integer minor units, no floats)
  services/     shared business logic (dual-currency money, etc.)
  i18n/         locales + RTL helpers (EN / Lebanese-Arabic)
supabase/
  migrations/   schema migrations (applied to prod via CI only)
```

## Development

```bash
pnpm install
pnpm dev          # all three apps
pnpm dev --filter @bach/storefront
```

Local Supabase stack: `supabase start` (Docker required).

## Secrets

This repository is public. **No credentials are ever committed.** Copy `.env.example` to `apps/<app>/.env.local` and fill values locally; production values live in GitHub Actions secrets and server-side env files only.
