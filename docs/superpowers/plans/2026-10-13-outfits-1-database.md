# Outfits — Plan 1: database, pricing, checkouts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Outfits exist in the database with one pricing function that both checkouts use, so an outfit can be sold (website or POS) and returned correctly before any screen exists.

**Architecture:** New tables `outfits`, `outfit_items`, `outfit_media`; outfit columns on `order_items` / `order_return_items`; `price_cart(p_lines, p_promo_kind, p_promo_value)` prices a whole cart (outfit groups, sell modes, promo modes) and is called by `storefront_checkout` and `pos_checkout`. Returns refund the line's paid share.

**Tech Stack:** Supabase Postgres (plpgsql, RLS), migrations pushed by the founder with `./scripts/sb db push`.

**Spec:** `docs/superpowers/specs/2026-10-13-outfits-design.md`

## Global Constraints

- No floating-point money: integer cents everywhere; rounding with `round()` / `floor()` on numeric.
- The browser's prices are never trusted: checkouts re-price on the server.
- Drafts never discount; an outfit discounts only when `status = 'published'`.
- Existing behaviour for carts without outfits must not change (same totals, same errors).
- Migrations are tested with a rolled-back transaction before the founder pushes them (scratchpad `migtest.py <migration> <test.sql>`; the test ends with `raise exception 'TESTRESULT …'`).
- Arabic copy in Lebanese half-formal tone; product names English.

## File structure

- Create `supabase/migrations/20261014090000_outfits.sql` — tables, columns, RLS, triggers, `price_cart`, `price_outfit`, return-credit fix.
- Create `supabase/migrations/20261014090100_outfits_checkouts.sql` — `storefront_checkout` and `pos_checkout` replaced to accept outfit lines.
- Create `supabase/tests/outfits.sql` — the rolled-back test script (kept in the repo for re-runs).

---

### Task 1: Tables, columns, RLS

**Files:**
- Create: `supabase/migrations/20261014090000_outfits.sql` (part 1)

**Interfaces:**
- Produces: tables `public.outfits`, `public.outfit_items`, `public.outfit_media`; columns `order_items.outfit_id uuid`, `order_items.outfit_group uuid`, `order_items.outfit_discount_cents int`, same three on `order_return_items`; `wishlists.outfit_id uuid`.

- [ ] **Step 1: Write the test (part of `supabase/tests/outfits.sql`)**

```sql
do $$
declare o uuid; jkt uuid; hod uuid; bot uuid;
begin
  select id into jkt from products where slug = 'corduroy-jacket-with-fireman-clasps';
  select id into hod from products where slug = 'basic-relaxed-fit-hoodie';
  select id into bot from products where slug = 'lug-sole-leather-chelsea-boots';
  insert into outfits (slug, name_en, name_ar, status, price_kind, percent_off)
  values ('zz-test-look', 'ZZ Test Look', 'طقم تجريبي', 'published', 'percent', 15) returning id into o;
  insert into outfit_items (outfit_id, product_id, sort) values (o, jkt, 0), (o, hod, 1), (o, bot, 2);
  if (select barcode from outfits where id = o) !~ '^2\d{12}$' then raise exception 'TESTFAIL outfit barcode'; end if;
  begin
    insert into outfit_items (outfit_id, product_id, sort) values (o, jkt, 3);
    raise exception 'TESTFAIL duplicate piece accepted';
  exception when unique_violation then null; end;
end $$;
```

- [ ] **Step 2: Run it — expect failure** (`relation "outfits" does not exist`)

Run: `python3 migtest.py supabase/migrations/20261014090000_outfits.sql supabase/tests/outfits.sql` (from the scratchpad, with absolute paths)

- [ ] **Step 3: Write part 1 of the migration**

```sql
create type public.outfit_price_kind as enum ('sum', 'percent', 'fixed');
create type public.outfit_promo_mode as enum ('exclude', 'stack', 'best');
create type public.outfit_sell_mode as enum ('flexible', 'whole', 'exclusive');

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  status public.product_status not null default 'draft',
  price_kind public.outfit_price_kind not null default 'sum',
  percent_off integer check (percent_off between 1 and 90),
  fixed_usd_cents integer check (fixed_usd_cents > 0),
  promo_mode public.outfit_promo_mode not null default 'exclude',
  sell_mode public.outfit_sell_mode not null default 'flexible',
  barcode text unique,
  meta_title_en text,
  meta_description_en text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_kind <> 'percent' or percent_off is not null),
  check (price_kind <> 'fixed' or fixed_usd_cents is not null)
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  default_color_code text,
  sort integer not null default 0,
  primary key (outfit_id, product_id)
);
create index outfit_items_product on public.outfit_items (product_id);

create table public.outfit_media (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  storage_path text not null,
  sort integer not null default 0,
  is_main boolean not null default false,
  alt_en text,
  created_at timestamptz not null default now()
);
create index outfit_media_outfit on public.outfit_media (outfit_id, sort);

alter table public.order_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0 check (outfit_discount_cents >= 0);
alter table public.order_return_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0;

alter table public.wishlists alter column product_id drop not null;
alter table public.wishlists add column outfit_id uuid references public.outfits (id) on delete cascade;
alter table public.wishlists add constraint wishlists_one_target check ((product_id is null) <> (outfit_id is null));

-- barcode from the in-store EAN-13 range, like variants
create or replace function public.outfits_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.barcode is null or btrim(new.barcode) = '' then new.barcode := public.next_internal_ean(); end if;
  new.updated_at := now();
  return new;
end $$;
create trigger outfits_defaults before insert or update on public.outfits
  for each row execute function public.outfits_defaults();

alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_media enable row level security;
create policy outfits_read on public.outfits for select using (status = 'published' or public.is_staff());
create policy outfits_write on public.outfits for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));
create policy outfit_items_read on public.outfit_items for select
  using (exists (select 1 from public.outfits o where o.id = outfit_id and (o.status = 'published' or public.is_staff())));
create policy outfit_items_write on public.outfit_items for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));
create policy outfit_media_read on public.outfit_media for select
  using (exists (select 1 from public.outfits o where o.id = outfit_id and (o.status = 'published' or public.is_staff())));
create policy outfit_media_write on public.outfit_media for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));
```

- [ ] **Step 4: Run the test — expect `TESTRESULT ok`**
- [ ] **Step 5: Commit** — `git add supabase/migrations/20261014090000_outfits.sql supabase/tests/outfits.sql && git commit -m "Outfits: tables, columns, RLS"`

---

### Task 2: Exclusive pieces belong to one outfit only

**Files:** Modify `supabase/migrations/20261014090000_outfits.sql` (append); test appended to `supabase/tests/outfits.sql`.

**Interfaces:** Produces trigger `outfit_exclusive_guard` (raises `piece already sold only inside another outfit`).

- [ ] **Step 1: Test** — create two outfits sharing the jacket, set both `sell_mode = 'exclusive'` → second update raises; `'whole'` on both is allowed.

```sql
do $$
declare a uuid; b uuid; jkt uuid; hod uuid; bot uuid;
begin
  select id into jkt from products where slug = 'corduroy-jacket-with-fireman-clasps';
  select id into hod from products where slug = 'basic-relaxed-fit-hoodie';
  select id into bot from products where slug = 'lug-sole-leather-chelsea-boots';
  insert into outfits (slug, name_en, name_ar, sell_mode) values ('zz-a', 'A', 'أ', 'exclusive') returning id into a;
  insert into outfit_items values (a, jkt, null, 0), (a, hod, null, 1);
  insert into outfits (slug, name_en, name_ar, sell_mode) values ('zz-b', 'B', 'ب', 'whole') returning id into b;
  insert into outfit_items values (b, jkt, null, 0), (b, bot, null, 1);
  begin
    update outfits set sell_mode = 'exclusive' where id = b;
    raise exception 'TESTFAIL two exclusive outfits share a piece';
  exception when raise_exception then
    if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
end $$;
```

- [ ] **Step 2: Run — expect `TESTFAIL two exclusive outfits share a piece`**
- [ ] **Step 3: Implement**

```sql
create or replace function public.outfit_exclusive_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_outfit uuid := coalesce(new.outfit_id, new.id);
begin
  if exists (
    select 1
    from public.outfit_items mine
    join public.outfits me on me.id = mine.outfit_id and me.sell_mode = 'exclusive'
    join public.outfit_items other on other.product_id = mine.product_id and other.outfit_id <> mine.outfit_id
    join public.outfits them on them.id = other.outfit_id and them.sell_mode = 'exclusive'
    where mine.outfit_id = v_outfit
  ) then
    raise exception 'piece already sold only inside another outfit';
  end if;
  return new;
end $$;
create trigger outfit_exclusive_guard_items after insert or update on public.outfit_items
  for each row execute function public.outfit_exclusive_guard();
create trigger outfit_exclusive_guard_outfits after update of sell_mode on public.outfits
  for each row when (new.sell_mode = 'exclusive') execute function public.outfit_exclusive_guard();
```

(`new.outfit_id` exists on `outfit_items`; on `outfits` the function reads `new.id` — write two thin wrappers if plpgsql complains about the missing field: `outfit_exclusive_guard_items()` using `new.outfit_id`, `outfit_exclusive_guard_outfits()` using `new.id`, both calling `_outfit_exclusive_check(p_outfit uuid)`.)

- [ ] **Step 4: Run — expect `TESTRESULT ok`**
- [ ] **Step 5: Commit** — `git commit -am "Outfits: one exclusive outfit per piece"`

---

### Task 3: `price_cart` — the single pricing function

**Files:** append to `supabase/migrations/20261014090000_outfits.sql`; tests appended.

**Interfaces:**
- Consumes: Task 1 tables.
- Produces:
  `public.price_cart(p_lines jsonb, p_promo_kind text default null, p_promo_value integer default 0) returns jsonb`
  - `p_lines`: `[{key text, variant_id uuid, quantity int, unit int, outfit_id uuid|null, outfit_group text|null}]` — `unit` is the line's current unit price computed by the caller from the database (never the browser).
  - `p_promo_kind`: `null` (no promo), `'percent_bp'` (value in basis points), `'fixed'` (value in cents).
  - returns `{lines:[{key, outfit_id, outfit_group, outfit_discount, promo_base}], outfit_discount int, promo_base int, promo_discount int}`.
  - raises `look sold complete only` (incomplete whole/exclusive group), `piece sold only as part of a look` (exclusive piece outside a complete group of its outfit).
  `public.price_outfit(p_outfit uuid) returns jsonb` — display helper for the storefront: `{complete_price, current_sum, saving}` with every piece at its default/cheapest current price.

- [ ] **Step 1: Tests**

```sql
do $$
declare o uuid; v_j uuid; v_h uuid; v_b uuid; r jsonb; lines jsonb;
begin
  select id into o from outfits where slug = 'zz-test-look';
  select pv.id into v_j from product_variants pv join products p on p.id = pv.product_id where p.slug = 'corduroy-jacket-with-fireman-clasps' and pv.is_active limit 1;
  select pv.id into v_h from product_variants pv join products p on p.id = pv.product_id where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active limit 1;
  select pv.id into v_b from product_variants pv join products p on p.id = pv.product_id where p.slug = 'lug-sole-leather-chelsea-boots' and pv.is_active limit 1;
  lines := jsonb_build_array(
    jsonb_build_object('key','1','variant_id',v_j,'quantity',1,'unit',12900,'outfit_id',o,'outfit_group','g1'),
    jsonb_build_object('key','2','variant_id',v_h,'quantity',1,'unit',4500,'outfit_id',o,'outfit_group','g1'),
    jsonb_build_object('key','3','variant_id',v_b,'quantity',1,'unit',8900,'outfit_id',o,'outfit_group','g1'));
  -- 15% of full prices 263.00 = 39.45
  r := price_cart(lines);
  if (r->>'outfit_discount')::int <> 3945 then raise exception 'TESTFAIL percent: %', r; end if;
  if (select sum((x->>'outfit_discount')::int) from jsonb_array_elements(r->'lines') x) <> 3945 then raise exception 'TESTFAIL split'; end if;
  -- incomplete flexible group: no discount
  r := price_cart(lines - 2);
  if (r->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL incomplete discounted'; end if;
  -- fixed 199.00 → 64.00 off
  update outfits set price_kind = 'fixed', fixed_usd_cents = 19900 where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 6400 then raise exception 'TESTFAIL fixed'; end if;
  -- fixed above the sum → no discount
  update outfits set fixed_usd_cents = 30000 where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL fixed above sum'; end if;
  -- best deal with a piece on sale: current sum 263 - 20 = 243 vs 15% of full 223.55 → 19.45 off current
  update outfits set price_kind = 'percent', percent_off = 15 where id = o;
  lines := jsonb_set(lines, '{0,unit}', '10900');
  if (price_cart(lines)->>'outfit_discount')::int <> 1945 then raise exception 'TESTFAIL best deal: %', price_cart(lines); end if;
  lines := jsonb_set(lines, '{0,unit}', '12900');
  -- promo exclude (default): discounted group not in the promo base
  r := price_cart(lines, 'percent_bp', 1000);
  if (r->>'promo_base')::int <> 0 then raise exception 'TESTFAIL exclude base: %', r; end if;
  -- stack: base = 263.00 - 39.45 = 223.55 → 10% = 22.36 (rounded)
  update outfits set promo_mode = 'stack' where id = o;
  r := price_cart(lines, 'percent_bp', 1000);
  if (r->>'promo_base')::int <> 22355 or (r->>'promo_discount')::int <> 2236 then raise exception 'TESTFAIL stack: %', r; end if;
  -- best: 30% code (78.90) beats the outfit's 39.45 → outfit discount dropped
  update outfits set promo_mode = 'best' where id = o;
  r := price_cart(lines, 'percent_bp', 3000);
  if (r->>'outfit_discount')::int <> 0 or (r->>'promo_discount')::int <> 7890 then raise exception 'TESTFAIL best: %', r; end if;
  -- whole: incomplete group refused
  update outfits set promo_mode = 'exclude', sell_mode = 'whole' where id = o;
  begin perform price_cart(lines - 2); raise exception 'TESTFAIL whole incomplete accepted';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if; end;
  -- exclusive: a piece alone refused
  update outfits set sell_mode = 'exclusive' where id = o;
  begin perform price_cart(jsonb_build_array(jsonb_build_object('key','x','variant_id',v_h,'quantity',1,'unit',4500)));
    raise exception 'TESTFAIL exclusive piece alone accepted';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if; end;
  -- draft outfit never discounts
  update outfits set sell_mode = 'flexible', status = 'draft' where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL draft discounted'; end if;
  update outfits set status = 'published' where id = o;
end $$;
```

- [ ] **Step 2: Run — expect `function price_cart(jsonb) does not exist`**
- [ ] **Step 3: Implement**

```sql
create or replace function public.price_cart(p_lines jsonb, p_promo_kind text default null, p_promo_value integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  g record;
  o record;
  v_items integer;
  v_complete boolean;
  v_cur integer;
  v_full integer;
  v_target integer;
  v_disc integer;
  v_left integer;
  v_code integer;
  v_out jsonb := '[]'::jsonb;
  v_lines jsonb;
  v_promo_base integer := 0;
  v_outfit_total integer := 0;
  l record;
begin
  create temp table if not exists _pc (
    key text, variant_id uuid, product_id uuid, quantity int, unit int, full_unit int,
    outfit_id uuid, outfit_group text, outfit_discount int default 0, promo_base int default 0
  ) on commit drop;
  truncate _pc;
  insert into _pc (key, variant_id, product_id, quantity, unit, full_unit, outfit_id, outfit_group)
  select x->>'key', (x->>'variant_id')::uuid, pv.product_id, (x->>'quantity')::int, (x->>'unit')::int,
         coalesce(pv.price_usd_cents_override, p.price_usd_cents),
         nullif(x->>'outfit_id', '')::uuid, nullif(x->>'outfit_group', '')
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) x
  join public.product_variants pv on pv.id = (x->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  -- exclusive pieces may only be bought inside a complete group of their outfit (checked after groups)
  for g in select distinct outfit_group, outfit_id from _pc where outfit_group is not null loop
    select * into o from public.outfits where id = g.outfit_id;
    if o is null then raise exception 'unknown look'; end if;
    select count(*) into v_items from public.outfit_items where outfit_id = o.id;
    v_complete := o.status = 'published'
      and (select count(*) from _pc where outfit_group = g.outfit_group) = v_items
      and not exists (select 1 from _pc where outfit_group = g.outfit_group and quantity <> 1)
      and (select count(distinct c.product_id) from _pc c join public.outfit_items oi
             on oi.outfit_id = o.id and oi.product_id = c.product_id
           where c.outfit_group = g.outfit_group) = v_items;
    if not v_complete and o.sell_mode in ('whole', 'exclusive') then
      raise exception 'look sold complete only';
    end if;
    if not v_complete then
      update _pc set promo_base = unit * quantity where outfit_group = g.outfit_group;
      continue;
    end if;
    select sum(unit), sum(full_unit) into v_cur, v_full from _pc where outfit_group = g.outfit_group;
    v_target := case o.price_kind
      when 'percent' then round(v_full::numeric * (100 - o.percent_off) / 100)::integer
      when 'fixed' then o.fixed_usd_cents
      else v_cur end;
    v_disc := greatest(v_cur - least(v_cur, v_target), 0);
    -- promo mode
    if v_disc > 0 and p_promo_kind is not null and o.promo_mode = 'best' then
      v_code := case p_promo_kind when 'percent_bp' then round(v_cur::numeric * p_promo_value / 10000)::integer
                                  else least(p_promo_value, v_cur) end;
      if v_code > v_disc then v_disc := 0; end if;
    end if;
    -- split in proportion to the current price; leftover cents to the priciest lines
    update _pc set outfit_discount = floor(v_disc::numeric * unit / greatest(v_cur, 1))::integer
    where outfit_group = g.outfit_group;
    v_left := v_disc - (select sum(outfit_discount) from _pc where outfit_group = g.outfit_group);
    for l in select key from _pc where outfit_group = g.outfit_group order by unit desc, key limit v_left loop
      update _pc set outfit_discount = outfit_discount + 1 where outfit_group = g.outfit_group and key = l.key;
    end loop;
    update _pc set promo_base = case
        when v_disc = 0 then unit * quantity
        when o.promo_mode = 'stack' then unit * quantity - outfit_discount
        else 0 end
    where outfit_group = g.outfit_group;
  end loop;
  update _pc set promo_base = unit * quantity where outfit_group is null;

  if exists (
    select 1 from _pc c
    join public.outfit_items oi on oi.product_id = c.product_id
    join public.outfits ex on ex.id = oi.outfit_id and ex.sell_mode = 'exclusive' and ex.status = 'published'
    where c.outfit_id is distinct from ex.id
  ) then
    raise exception 'piece sold only as part of a look';
  end if;

  select coalesce(sum(outfit_discount), 0), coalesce(sum(promo_base), 0) into v_outfit_total, v_promo_base from _pc;
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'outfit_id', outfit_id, 'outfit_group', outfit_group,
           'outfit_discount', outfit_discount, 'promo_base', promo_base)), '[]'::jsonb)
  into v_lines from _pc;
  return jsonb_build_object(
    'lines', v_lines,
    'outfit_discount', v_outfit_total,
    'promo_base', v_promo_base,
    'promo_discount', case p_promo_kind
      when 'percent_bp' then round(v_promo_base::numeric * p_promo_value / 10000)::integer
      when 'fixed' then least(p_promo_value, v_promo_base)
      else 0 end
  );
end $$;
grant execute on function public.price_cart(jsonb, text, integer) to anon, authenticated;
```

Note: `stable` is wrong for a function that writes a temp table — declare it `volatile` (default) if Postgres rejects the temp-table insert.

- [ ] **Step 4: Run — expect `TESTRESULT ok`**
- [ ] **Step 5: Commit** — `git commit -am "Outfits: price_cart"`

---

### Task 4: Return credit uses what was actually paid

**Files:** append to `supabase/migrations/20261014090000_outfits.sql`; test appended.

**Interfaces:** Modifies `public._validate_return` so the ratio is `(order total − delivery) / Σ order line totals` instead of `/ subtotal`. Lines with a POS line discount or an outfit share are refunded at their paid share (fixes the double-counted line discount).

- [ ] **Step 1: Test** — insert a POS-like order with subtotal 10000, one line with line_total 9000 (10% line discount), total 9000; `_validate_return` for that line must credit 9000 (today it credits 8100).
- [ ] **Step 2: Run — expect `TESTFAIL credit 8100`**
- [ ] **Step 3: Implement** — copy `_validate_return` from the live database (`select pg_get_functiondef('public._validate_return'::regproc)`), change the `_return_credit` call's 4th argument from `v_order.subtotal_usd_cents` to `(select coalesce(sum(line_total_usd_cents), 0) from public.order_items where order_id = v_order.id)`, and also copy `outfit_id, outfit_group, outfit_discount_cents` into the `order_return_items` insert in `pos_return`, `pos_exchange` and the online return flow (`order_return_items` writers: find with `grep -rn "insert into public.order_return_items" supabase/migrations`).
- [ ] **Step 4: Run — expect `TESTRESULT ok`**
- [ ] **Step 5: Commit** — `git commit -am "Returns refund the paid share of a line"`

---

### Task 5: `storefront_checkout` with outfit groups

**Files:** Create `supabase/migrations/20261014090100_outfits_checkouts.sql`; tests appended.

**Interfaces:**
- Consumes: `price_cart`.
- Produces: `storefront_checkout` (same signature) whose `p_items` lines may carry `outfit_id` and `outfit_group` (any string, one per outfit instance). Writes `order_items.outfit_id / outfit_group (uuid via md5) / outfit_discount_cents`; `line_total = unit × qty − outfit share`; `orders.discount_usd_cents` includes outfit savings; promo base from `price_cart`.

- [ ] **Step 1: Test** — call `storefront_checkout` with the three test-look pieces (each with stock ≥ 1, chosen in the test), COD, pickup; expect `discount_usd_cents = 3945`, three `order_items` rows with the outfit id and shares summing to 3945, reserved stock +1 each. Then a 10% code with `promo_mode = 'exclude'` → discount stays 3945.
- [ ] **Step 2: Run — expect failure** (current function ignores outfits: discount 0)
- [ ] **Step 3: Implement** — start from the live definition (saved in the scratchpad as `fn_storefront_checkout.sql`), and change:
  1. uniqueness: `count(distinct (i->>'variant_id') || '|' || coalesce(i->>'outfit_group',''))` must equal the line count;
  2. stock: check the **sum** of quantities per variant (`select variant_id, sum(qty) … group by variant_id`) against `quantity − reserved` with `for update`, once per variant;
  3. `_web` gains `key text, outfit_id uuid, outfit_group text, outfit_discount int default 0`;
  4. after the loop: build `p_lines` from `_web` and call `price_cart(lines, kind, value)` where kind/value come from the promo code (`percent` → `'percent_bp'`, value × 100; else `'fixed'`, value) — validate the code first exactly as today;
  5. `update _web set outfit_discount = …` from the result lines; `v_outfit := result->>'outfit_discount'`; `v_discount := (result->>'promo_discount') + v_outfit`;
  6. wallet incentive on `v_subtotal − v_discount`;
  7. `order_items` insert adds the three columns with `outfit_group := md5(o_group || v_order_id)::uuid` and `line_total = unit × qty − outfit_discount`.
- [ ] **Step 4: Run — expect `TESTRESULT ok`**; also re-run a plain cart (no outfits) and compare totals with the old function on the same cart (equal).
- [ ] **Step 5: Commit** — `git commit -am "storefront_checkout: outfit groups"`

---

### Task 6: `pos_checkout` with outfit groups

**Files:** append to `supabase/migrations/20261014090100_outfits_checkouts.sql`; tests appended.

**Interfaces:** `pos_checkout` (same signature): lines may carry `outfit_id` / `outfit_group`; a line in an outfit group must have `line_discount_bp = 0` (raise `no line discount on a look`); the invoice-wide / birthday discount goes through `price_cart` as `'percent_bp'` so the outfit's promo mode applies; `order_items` gets the outfit columns, `line_total` net of the share.

- [ ] **Step 1: Test** — POS sale of the three pieces as a group with cash → discount 3945, order items carry the outfit; same sale with `p_discount_basis_points = 1000` and `promo_mode = 'exclude'` → discount still 3945.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement** — from the live definition (`fn_pos_checkout.sql`): `_lines` gains `key, outfit_id, outfit_group`; after the stock loop call `price_cart` with `'percent_bp', v_discount_bp`; `v_discount := v_line_discounts + promo_discount + outfit_discount`; the `order_items` insert subtracts the outfit share from `line_total`.
- [ ] **Step 4: Run — expect `TESTRESULT ok`** and a plain POS sale unchanged.
- [ ] **Step 5: Commit** — `git commit -am "pos_checkout: outfit groups"`

---

### Task 7: Returns of outfit pieces (exclusive = whole)

**Files:** append to `supabase/migrations/20261014090100_outfits_checkouts.sql`; tests appended.

**Interfaces:** `pos_return` / `pos_exchange` / online return approval: when a returned line belongs to an `exclusive` outfit group, every line of that group must be returned in the same request (raise `this look is returned complete`). A size/colour exchange of the same product keeps the paid price (existing behaviour, verify).

- [ ] **Step 1: Test** — sell the test look as `flexible` → return the hoodie alone → credit = its paid share; set `exclusive` → sell again → return the hoodie alone → raises.
- [ ] **Step 2: Run — expect failure on the exclusive case**
- [ ] **Step 3: Implement** — in `_validate_return` after loading lines: if any requested line has `outfit_group` whose outfit is `exclusive`, require all lines of that `outfit_group` (minus already returned) in the request.
- [ ] **Step 4: Run — expect `TESTRESULT ok`**
- [ ] **Step 5: Commit**, then hand the two migrations to the founder: `cd ~/Documents/Projects/Bach/bach-platform && ./scripts/sb db push`

---

## Next plans (written after Plan 1 lands)

- Plan 2 — MGMT: outfits list + editor (pieces, photos, price, sell mode, promo mode, SEO, barcode card), warnings, product page "part of N outfits", shop switch.
- Plan 3 — Website: `/outfits/[slug]`, bag grouping, listings (cards, PDP section, menu, /outfits), search, SEO, analytics, favourites.
- Plan 4 — POS: outfits in the catalogue cache, automatic recognition, outfit search / card scan, receipt grouping, returns UI.
- Plan 5 — Receipts / emails / packing slip, reports (outfit sales), help articles.
