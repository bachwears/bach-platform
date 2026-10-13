# Outfits — Plan 3: website

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Customers find, open, configure and buy outfits on bachwears.com; the bag and checkout show the same price the server charges.

**Architecture:** A cached `getOutfitCatalog()` (published outfits with pieces, media and modes) feeds the menu, the shop cards, the PDP section, the `/outfits` index and exclusive-piece hiding. `/outfits/[slug]` renders a client `OutfitView`. Bag lines carry the outfit (`outfitId`, `outfitGroup`, `outfitName`, `outfitMode`); the bag and checkout call `price_cart` (granted to anon) for the outfit and promo discount so the browser shows exactly what `storefront_checkout` will charge. The live total on the outfit page uses the shared `outfitPrice` (moved to `@bach/ui/lib/outfit-price`).

**Spec:** `docs/superpowers/specs/2026-10-13-outfits-design.md` §4

## Global Constraints
- English storefront, Zara-style (white/black, square, hairline, light uppercase type, no emojis).
- Never trust the browser: checkout re-prices on the server; the browser only displays.
- Exclusive-look pieces never appear as standalone products while their look is published.
- A look is listed only while every piece is published, photographed and in stock; its page always opens.

## Tasks
1. **Shared price helper** — move `apps/mgmt/lib/outfit-price.ts` to `packages/ui/src/lib/outfit-price.ts`; MGMT re-exports.
2. **Data** — `lib/outfits.ts`: `getOutfitCatalog()` (cached, tag `catalog`) and `getOutfit(slug)`; types `OutfitSummary`, `OutfitDetail`; helpers `isSellableOutfit`, `exclusiveProductIds`.
3. **Cart model** — `lib/cart.ts`: `CartLine` gains `outfitId?`, `outfitGroup?`, `outfitName?`, `outfitSlug?`, `outfitMode?`; `lineKey`; `addOutfitToCart`; `setQuantity(variantId, qty, group?)`; removing a piece of a `whole`/`exclusive` look removes the look.
4. **Outfit page** — `app/outfits/[slug]/page.tsx` + `components/outfit-view.tsx`: gallery, piece rows (front/back in the chosen colour, colour squares, sizes, include tick for flexible looks), pinned bar (total, saving, ADD THE LOOK / ADD n PIECES), every stock case from the spec table, metadata + JSON-LD, analytics `outfit_view` / `outfit_add`.
5. **Bag and checkout** — group outfit lines under the outfit name with the saving (from `price_cart`); no quantity buttons on look pieces; checkout sends `outfit_id` / `outfit_group` and shows `price_cart`'s outfit and promo discounts.
6. **Listings** — `/outfits` index; menu "Outfits" under NEW IN; outfit cards in the shop grid (`shop.outfit_cards`, default on, unfiltered featured view); "Wear the full look" on each piece's PDP; exclusive pieces hidden from shop/search/strip/rows and their PDP redirects to the look; sitemap entries.
7. **Verify** — build, deploy; with the founder's OK publish the test look briefly, run every stock case and a COD test order (cancelled after), then set it back to draft.
