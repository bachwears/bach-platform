# Outfits (bundles of existing products) — design

Date: 2026-10-13 · Status: approved in chat, awaiting written-spec review
Owner: founder (BACH Wears) · Apps: storefront, POS, MGMT, Supabase

## 1. What an outfit is

A curated look made only of **existing products** (2 or more). It has its own
page, photos, link, SEO, barcode and optional special price, but **no stock and
no variants of its own**: every sale of an outfit is recorded as the pieces'
own variants, linked to the outfit. Stock, returns, labels, inventory, the POS
catalogue and reports keep working unchanged.

Founder decisions (2026-10-13):

| # | Topic | Decision |
|---|---|---|
| 1 | Buying on the website | All pieces ticked by default; the customer may untick any. The outfit price applies only when every piece is taken; otherwise each piece is at its own price (B) |
| 2 | Special price | Per outfit: none (= sum of pieces), a percentage off, or a fixed price (C) |
| 3 | Pieces already on sale | Best deal, never stacked: pay the lower of (current sum incl. sales) and (outfit price on full prices) (B) |
| 4 | Promo codes | Default: a code does not apply to a discounted outfit's pieces. Per-outfit setting can switch to "both apply" or "best deal" |
| 5 | POS | Both: automatic recognition when all pieces are in the cart + manual outfit search / outfit card scan; outfit prices apply at the POS too (C, yes) |
| 6 | Returning one piece | Refund the piece's share of the outfit price; the other pieces keep theirs (A) |
| 7 | Where outfits appear | Menu link + /outfits page + "Wear the full look" on each piece's page + outfit cards mixed into the shop grid, with an MGMT switch (C) |
| 8 | Sold together only | Per-outfit sell mode (C): `flexible` (decision 1, default), `whole` (the look is taken complete or not at all; pieces still sell on their own pages / POS), `exclusive` (the pieces are sold only inside this outfit, never on their own) |
| — | Returns for together-only outfits | `whole`: a piece may be returned at its share (decision 6). `exclusive`: only the complete outfit is returned (recommended; founder answered C without objecting) |
| — | Architecture | Separate `outfits` records linked to products (Approach 1), not products of type outfit |

## 2. Data model (one migration)

`outfits`
- id, slug (unique), name_en, name_ar, description_en, description_ar
- status `draft | published | archived` (default draft)
- price_kind `sum | percent | fixed` (default sum); percent_off int (1–90);
  fixed_usd_cents int (> 0)
- promo_mode `exclude | stack | best` (default exclude)
- sell_mode `flexible | whole | exclusive` (default flexible)
- barcode text unique — from `next_internal_ean()` on insert
- meta_title_en, meta_description_en, sort int, created_at, updated_at

`outfit_items`
- outfit_id → outfits (cascade), product_id → products (restrict), unique (outfit_id, product_id)
- default_color_code (the colour shown in the outfit photos; nullable), sort

`outfit_media`
- outfit_id → outfits (cascade), storage_path, sort, is_main bool, alt_en

Order lines
- `order_items.outfit_id` uuid null → outfits (set null),
  `order_items.outfit_group` uuid null (one id per outfit instance in a sale),
  `order_items.outfit_discount_cents` int not null default 0
- `order_return_items` gets the same three columns, copied from the sold line

Exclusive pieces
- A product may belong to at most **one** `exclusive` outfit (enforced by a
  trigger on `outfit_items` / `outfits.sell_mode`).
- View `exclusive_products` (product_id, outfit_id) lists pieces that may not
  be sold on their own while that outfit is published.

Other
- `wishlists` gets `outfit_id` (nullable; product_id becomes nullable; check: exactly one set)
- `site_events.meta` carries `outfit_id` for outfit events (no schema change)
- site_content `shop.outfit_cards` boolean (mix outfit cards into the shop grid)

RLS: anyone reads published outfits (+ their items/media); catalogue roles
(super_admin, store_manager, marketing_manager) write. Staff read all.

## 3. Pricing — one function used everywhere

`price_outfit(p_outfit uuid, p_lines jsonb) returns jsonb`
`p_lines`: `[{variant_id, quantity}]` — the outfit's chosen pieces.

1. Load the outfit's items; for each line find its product and the variant's
   **current** price (sale price when lower) and **full** price.
2. Complete = every outfit item's product has exactly one line, quantity 1, and
   the outfit is published (website and POS alike; drafts never discount).
   Not complete → no discount; each line at its current price.
3. Complete:
   - `current_sum` = Σ current prices
   - outfit target = `sum`: current_sum · `percent`: round(Σ full × (100 − p) / 100) · `fixed`: fixed_usd_cents
   - pay = min(current_sum, target); discount = current_sum − pay (≥ 0)
4. Split the discount over the lines in proportion to their current price;
   round each down, give the leftover cents to the largest lines so the
   shares add up exactly.
5. Returns `{complete, current_sum, pay, discount, promo_mode, lines:[{variant_id, unit_price, outfit_discount_cents}]}`.

Promo codes (`storefront_checkout` and `pos_checkout`):
- `exclude` (default): the code's base excludes lines of a discounted outfit
  (discount > 0). An outfit whose discount is 0 is treated like normal lines.
- `stack`: the code applies to the outfit lines after the outfit price.
- `best`: per outfit group, take the larger of the outfit discount and the
  code's discount on those lines — never both.

Sell-mode enforcement (server side, both checkouts):
- `whole` and `exclusive`: an outfit group must be complete, or the checkout
  is refused ("this look is sold complete only").
- `exclusive`: a line for an exclusive piece without a complete outfit group
  of its outfit is refused — the piece can't be bought on its own anywhere.

Both checkouts accept lines with optional `outfit_id` + `outfit_group`; they
regroup by `outfit_group`, call `price_outfit` per group server-side (the
browser's numbers are never trusted), reserve stock per variant exactly as
today, and write `outfit_id / outfit_group / outfit_discount_cents` on
`order_items`. `discount_usd_cents` on the order includes outfit savings.

## 4. Website

`/outfits/[slug]`
- Gallery of outfit photos (zoom, swipe), then one row per piece: product
  front/back photos in the chosen colour (no model shots), name + current
  price + link to its page, colour squares, sizes, include tick box.
- Pinned bar: total; full look shows ~~sum~~ **pay · Save N%/$X**; button
  `ADD THE LOOK (n)` / `ADD n PIECES`; a missing size scrolls to that piece.

Stock cases

| Case | Shows |
|---|---|
| Size sold out | crossed out + Notify me (as PDP) |
| Default colour sold out | piece switches to an in-stock colour, note "Shown in X" |
| Whole piece sold out | piece marked SOLD OUT, unticked and locked, Notify me; banner: buy the rest at their own prices; no outfit discount |
| Piece archived / draft | same as sold out; MGMT warns |
| Piece without photo | neutral frame |
| Listing rule | an outfit is listed only while **every** piece has stock; its page always opens |

Sell modes on the website
- `flexible`: as above (tick boxes).
- `whole`: no tick boxes; button `ADD THE LOOK`; any piece sold out → the
  whole look is unavailable with "Notify me" for the look. Pieces keep their
  own pages and listings.
- `exclusive`: as `whole`, and the pieces are hidden from shop / search /
  rows / strips as standalone products; their own pages redirect to the
  outfit page. Removing a piece in the bag removes the whole look.

Bag: outfit pieces grouped under the outfit name with the saving; removing a
piece or changing a quantity ends the outfit price (note shown); the same
outfit added twice = two groups (`outfit_group`).

Also: `/outfits` index; menu "Outfits" under NEW IN; "Wear the full look" on
each piece's PDP; outfit cards in the shop grid (switch `shop.outfit_cards`);
search finds outfits; sitemap; JSON-LD (ItemList of the products + Offer);
analytics events `outfit_view`, `outfit_add`, purchases attributed by
`outfit_id`; favourites accept outfits.

## 5. MGMT

New page **الأطقم (Outfits)** — catalogue roles.
- List: main photo, name, pieces, price, status, sellability ("قابل للبيع" /
  "قطعة خالصة: …"), search.
- Editor: basics (EN/AR name, slug, description, status); pieces (search
  existing products with photo, default colour, reorder; minimum 2); photos
  (upload, reorder, main); price (sum / percent / fixed with live preview and
  a warning when fixed ≥ sum); promo mode; SEO (auto when empty); barcode +
  "اطبع بطاقة" display card.
- Sell mode: «مرن» (default) / «الطقم كامل بس» / «القطع ما بتنباع إلا مع بعض»;
  exclusive refuses a piece that already belongs to another exclusive outfit
  and warns that the pieces leave the shop as standalone products.
- Warnings for archived / draft / sold-out / photoless pieces.
- Product page shows "ضمن N أطقم" with links. Site content: outfit-cards switch.

## 6. POS

- Catalogue loads published outfits with their items (cached for offline).
- Automatic: when every piece of an outfit is in the cart (one each), the
  outfit price applies with a line "Outfit: <name> −$X"; removing a piece
  removes it; overlapping outfits → the larger saving wins.
- Manual: outfit search / scan the outfit card → pick colour and size per
  piece → added as a group.
- Sell modes: `whole`/`exclusive` outfits are added complete only; an
  `exclusive` piece scanned alone prompts "sold only in <outfit>" and offers
  to open the outfit; checkout refuses an incomplete group.
- `pos_checkout` re-prices server-side (same function). Returns refund the
  line's paid share (unit − outfit share); an exchange of size/colour of the
  same product keeps the paid price. `exclusive` outfits are returned whole
(all pieces of the group together); `whole` and `flexible` allow one piece.

## 7. Receipts, invoices, reports

- POS receipt, reprint, packing slip, order emails: outfit pieces grouped
  under the outfit name with a line "Outfit saving −$X".
- Returns screen shows the outfit and the piece's share.
- Reports: per-piece revenue unchanged; new "Outfit sales" (count, revenue,
  discount given, best sellers). Analytics: outfit views, adds, conversion.

## 8. Testing

Rolled-back DB tests: price_outfit (percent, fixed, fixed ≥ sum, a piece on
sale, cent-exact split, each promo mode, incomplete / sold-out piece);
storefront_checkout and pos_checkout (server re-pricing, stock per piece,
order_items outfit columns); sell modes (incomplete `whole` group refused,
exclusive piece alone refused, exclusive whole-return); returns and
exchanges; RLS. Live: outfit page
stock cases, untick, bag, test COD order (then cancelled), shop card and PDP
section; POS auto discount, removal, card scan, test sale + return; reports
and analytics show the test sale.

Test outfit (draft until approved): **The Corduroy Look** — Corduroy Jacket
with Fireman Clasps ($129) + Basic Relaxed Fit Hoodie ($45) + Lug-sole Leather
Chelsea Boots ($89) = $263; 15% off → $223.55 (save $39.45).

## 9. Rollout order

1. Migration (tables, columns, RLS, `price_outfit`, checkout changes) + tests
2. MGMT outfits page and editor
3. Website: outfit page, bag, listings, PDP section, menu, SEO, analytics
4. POS: recognition, search/scan, receipt
5. Receipts/emails/packing slip, reports, help articles (AR + EN)

Nothing shows on the website until an outfit is published.
