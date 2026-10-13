# Outfits — Plan 2: MGMT

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Staff create and manage outfits in MGMT: list, editor (pieces, photos, price, sell mode, promo mode, SEO, status), barcode display card, warnings, "part of N outfits" on product pages, and the shop switch for outfit cards.

**Architecture:** Client components on Supabase (RLS from plan 1 allows catalogue roles to write `outfits`, `outfit_items`, `outfit_media`). Photos go through the existing `CropUpload` (3:4, WebP, `product-media/site/outfit-…`). The price preview mirrors `price_cart` for the complete look (sum / percent of full prices / fixed, the lower of that and the current sum).

**Tech Stack:** Next.js 16 App Router (apps/mgmt), `@bach/ui`, Supabase JS.

**Spec:** `docs/superpowers/specs/2026-10-13-outfits-design.md` §5

## Global Constraints
- Arabic UI, Lebanese half-formal; product and outfit names English (name_ar optional copy).
- Catalogue roles only: super_admin, store_manager, marketing_manager (`lib/access.ts` CATALOG).
- No emojis; icons from `@bach/ui` Icon set.
- Every write reports errors; a write that changes 0 rows shows `NOT_SAVED`.

## Files
- Create `apps/mgmt/app/outfits/page.tsx` — list page.
- Create `apps/mgmt/app/outfits/[id]/page.tsx` — editor page (server: role + outfit id).
- Create `apps/mgmt/components/outfits-list.tsx` — list, search, create.
- Create `apps/mgmt/components/outfit-editor.tsx` — the editor sections.
- Create `apps/mgmt/lib/outfit-price.ts` — `outfitPrice(pieces, outfit)` preview (mirror of price_cart for a complete look) + `outfitHealth(pieces)` warnings.
- Modify `apps/mgmt/components/nav.tsx`, `apps/mgmt/lib/access.ts` — menu entry + access.
- Modify `apps/mgmt/app/products/[id]/page.tsx` — "ضمن N أطقم" with links.
- Modify `apps/mgmt/components/site-content-editor.tsx` — `shop.outfit_cards` switch (saved together with colour_cards and pdp_strip).

### Task 1: price preview + health helpers (`lib/outfit-price.ts`)
- `outfitPrice({ pieces: [{ current: number; full: number }], kind, percent, fixed })` → `{ sum, full, pay, saving, percentSaving }` with `pay = min(sum, target)`; target = percent → round(full × (100−p)/100), fixed → fixed, sum → sum.
- `outfitHealth(pieces: [{ name, status, hasFront, stock }])` → Arabic warnings: archived/draft piece, sold-out piece, photoless piece; fewer than 2 pieces.
- Verify with `npx tsc` and a node one-liner on the compiled maths (15% of 263 → 223.55; fixed 300 → pay 263).

### Task 2: list page
- Rows: main photo (or empty frame), name, piece count, price (`~~sum~~ pay`), status badge, sell mode, health ("قابل للبيع" or first warning). Search by name. "طقم جديد" creates a draft (name «طقم جديد», slug `look-<timestamp>`) and opens it.

### Task 3: editor
Sections (each saves on its own button, like the product page):
1. الأساسيات — name_en, name_ar, slug (auto from name_en until edited), description_en/ar, status.
2. القطع — search products (name/code, thumbnail), add (no duplicates), default colour select from the product's colours, reorder ↑↓, remove; minimum 2 to publish.
3. الصور — `CropUpload` (3:4, 1200×1600) to add; list with reorder, main, remove.
4. السعر — sum / percent / fixed with live preview (`outfitPrice`), warning when fixed ≥ sum.
5. طريقة البيع — flexible / whole / exclusive (exclusive shows the "pieces leave the shop" warning; DB refuses a piece already exclusive elsewhere — show its message in Arabic).
6. أكواد الخصم — exclude / stack / best.
7. Google (SEO) — meta title/description (empty = automatic).
8. الباركود — EAN-13 + «اطبع بطاقة» (A6 card: BACH logo, outfit name, pieces, price, Code 128 barcode).
- Publishing is refused with fewer than 2 pieces or no photo.

### Task 4: product page + shop switch + nav
- Product page header: «ضمن N أطقم» linking to each outfit.
- Site content: «الأطقم بين القطع بالشوب» switch → `shop.outfit_cards` (default on), saved with the other two shop fields.
- Nav: «الأطقم» under the catalogue group; access CATALOG.

### Task 5: test outfit + build
- Create «The Corduroy Look» as a **draft** (jacket, hoodie, boots; 15%) via the database so the founder can open it in MGMT.
- `pnpm --filter @bach/mgmt build`, commit, push, wait for deploy; founder checks the screens (MGMT needs his login).
