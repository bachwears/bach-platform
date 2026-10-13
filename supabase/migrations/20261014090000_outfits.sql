-- Outfits: curated looks made of existing products (spec:
-- docs/superpowers/specs/2026-10-13-outfits-design.md, plan 1).
--
-- An outfit has its own page, photos, barcode and optional special price, but
-- no stock or variants of its own: selling it records the pieces' own
-- variants on order_items, tagged with the outfit and each piece's share of
-- the discount. price_cart() is the one pricing function both checkouts use.

-- 1 ── tables ─────────────────────────────────────────────────────────────────
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
  -- sum: the pieces' current prices · percent: % off their full prices · fixed: one price
  price_kind public.outfit_price_kind not null default 'sum',
  percent_off integer check (percent_off between 1 and 90),
  fixed_usd_cents integer check (fixed_usd_cents > 0),
  -- promo codes on a discounted outfit: not applied (default), both, or the bigger one
  promo_mode public.outfit_promo_mode not null default 'exclude',
  -- flexible: pieces can be left out · whole: complete look only · exclusive: the
  -- pieces are never sold on their own
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
  -- the colour the outfit photos show; the customer may pick another
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

-- a saved outfit (favourites; wishlists is keyed by product, so outfits get their own)
create table public.outfit_favourites (
  customer_id uuid not null references public.customers (id) on delete cascade,
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, outfit_id)
);

-- sold and returned lines remember their outfit and the piece's share of its discount
alter table public.order_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0 check (outfit_discount_cents >= 0);
alter table public.order_return_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0;

-- barcode from the in-store EAN-13 range (like variants), updated_at on change
create or replace function public.outfits_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.barcode is null or btrim(new.barcode) = '' then
    new.barcode := public.next_internal_ean();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger outfits_defaults before insert or update on public.outfits
  for each row execute function public.outfits_defaults();

-- 2 ── access ─────────────────────────────────────────────────────────────────
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_media enable row level security;
alter table public.outfit_favourites enable row level security;

create policy outfits_read on public.outfits for select
  using (status = 'published' or public.is_staff());
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

create policy outfit_favourites_own on public.outfit_favourites for all
  using (customer_id in (select c.id from public.customers c where c.auth_user_id = auth.uid()))
  with check (customer_id in (select c.id from public.customers c where c.auth_user_id = auth.uid()));
create policy outfit_favourites_staff on public.outfit_favourites for select using (public.is_staff());

-- 3 ── an exclusive piece belongs to one exclusive outfit ─────────────────────
-- "exclusive" means the pieces are never sold on their own, so a piece can't
-- be exclusive to two outfits at once.
create or replace function public._outfit_exclusive_check(p_outfit uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1
    from public.outfit_items mine
    join public.outfits me on me.id = mine.outfit_id and me.sell_mode = 'exclusive'
    join public.outfit_items other on other.product_id = mine.product_id and other.outfit_id <> mine.outfit_id
    join public.outfits them on them.id = other.outfit_id and them.sell_mode = 'exclusive'
    where mine.outfit_id = p_outfit
  ) then
    raise exception 'piece already sold only inside another outfit';
  end if;
end $$;

create or replace function public.outfit_items_exclusive_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public._outfit_exclusive_check(new.outfit_id);
  return new;
end $$;
create trigger outfit_items_exclusive_guard after insert or update on public.outfit_items
  for each row execute function public.outfit_items_exclusive_guard();

create or replace function public.outfits_exclusive_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public._outfit_exclusive_check(new.id);
  return new;
end $$;
create trigger outfits_exclusive_guard after update of sell_mode on public.outfits
  for each row when (new.sell_mode = 'exclusive') execute function public.outfits_exclusive_guard();

-- 4 ── price_cart: the one pricing function (website and POS) ─────────────────
-- p_lines: [{key, variant_id, quantity, unit, outfit_id?, outfit_group?}] — unit is
-- the line's current price, read from the database by the caller (never the browser).
-- p_promo_kind: null · 'percent_bp' (value in basis points) · 'fixed' (value in cents).
-- Per outfit group: complete (every piece once, published look) → pay the lower of
-- the current sum and the look's price on full prices; the saving is split over the
-- pieces in proportion to their price. The promo code's base then follows the look's
-- promo mode (exclude / stack / best). Whole and exclusive looks must be complete;
-- an exclusive look's pieces can't be bought outside it.
create or replace function public.price_cart(p_lines jsonb, p_promo_kind text default null, p_promo_value integer default 0)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g record;
  o record;
  l record;
  v_items integer;
  v_complete boolean;
  v_cur integer;
  v_full integer;
  v_target integer;
  v_disc integer;
  v_left integer;
  v_code integer;
  v_lines jsonb;
  v_promo_base integer;
  v_outfit_total integer;
begin
  if p_promo_kind is not null and p_promo_kind not in ('percent_bp', 'fixed') then
    raise exception 'invalid promo kind';
  end if;
  create temp table if not exists _pc (
    key text, variant_id uuid, product_id uuid, quantity int, unit int, full_unit int,
    outfit_id uuid, outfit_group text, outfit_discount int not null default 0, promo_base int not null default 0
  ) on commit drop;
  truncate _pc;
  insert into _pc (key, variant_id, product_id, quantity, unit, full_unit, outfit_id, outfit_group)
  select x->>'key', pv.id, pv.product_id, (x->>'quantity')::int, (x->>'unit')::int,
         coalesce(pv.price_usd_cents_override, p.price_usd_cents),
         nullif(x->>'outfit_id', '')::uuid, nullif(x->>'outfit_group', '')
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) x
  join public.product_variants pv on pv.id = (x->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;
  if (select count(*) from _pc) <> jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) then
    raise exception 'unknown item in cart';
  end if;
  -- a group always names one look
  if exists (select 1 from _pc where outfit_group is not null group by outfit_group having count(distinct outfit_id) <> 1) then
    raise exception 'invalid look group';
  end if;

  update _pc set promo_base = unit * quantity where outfit_group is null;

  for g in select distinct outfit_group, outfit_id from _pc where outfit_group is not null loop
    select * into o from public.outfits where id = g.outfit_id;
    if o.id is null then raise exception 'unknown look'; end if;
    select count(*) into v_items from public.outfit_items where outfit_id = o.id;
    v_complete := o.status = 'published'
      and (select count(*) from _pc where outfit_group = g.outfit_group) = v_items
      and not exists (select 1 from _pc where outfit_group = g.outfit_group and quantity <> 1)
      and (select count(distinct c.product_id) from _pc c
           join public.outfit_items oi on oi.outfit_id = o.id and oi.product_id = c.product_id
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

    -- "best": the code wins if it takes more off these pieces than the look does
    if v_disc > 0 and p_promo_kind is not null and o.promo_mode = 'best' then
      v_code := case p_promo_kind
        when 'percent_bp' then round(v_cur::numeric * p_promo_value / 10000)::integer
        else least(p_promo_value, v_cur) end;
      if v_code > v_disc then v_disc := 0; end if;
    end if;

    -- the saving split over the pieces by price; leftover cents to the priciest
    update _pc set outfit_discount = floor(v_disc::numeric * unit / greatest(v_cur, 1))::integer
    where outfit_group = g.outfit_group;
    v_left := v_disc - (select coalesce(sum(outfit_discount), 0) from _pc where outfit_group = g.outfit_group);
    for l in select key from _pc where outfit_group = g.outfit_group order by unit desc, key limit greatest(v_left, 0) loop
      update _pc set outfit_discount = outfit_discount + 1 where outfit_group = g.outfit_group and key = l.key;
    end loop;

    update _pc set promo_base = case
        when v_disc = 0 then unit * quantity
        when o.promo_mode = 'stack' then unit * quantity - outfit_discount
        else 0 end
    where outfit_group = g.outfit_group;
  end loop;

  -- an exclusive look's pieces are sold only inside it
  if exists (
    select 1 from _pc c
    join public.outfit_items oi on oi.product_id = c.product_id
    join public.outfits ex on ex.id = oi.outfit_id and ex.sell_mode = 'exclusive' and ex.status = 'published'
    where c.outfit_id is distinct from ex.id
  ) then
    raise exception 'piece sold only as part of a look';
  end if;

  select coalesce(sum(outfit_discount), 0), coalesce(sum(promo_base), 0) into v_outfit_total, v_promo_base from _pc;
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', key, 'outfit_id', outfit_id, 'outfit_group', outfit_group,
           'outfit_discount', outfit_discount, 'promo_base', promo_base) order by key), '[]'::jsonb)
  into v_lines from _pc;
  return jsonb_build_object(
    'lines', v_lines,
    'outfit_discount', v_outfit_total,
    'promo_base', v_promo_base,
    'promo_discount', case p_promo_kind
      when 'percent_bp' then round(v_promo_base::numeric * p_promo_value / 10000)::integer
      when 'fixed' then least(greatest(p_promo_value, 0), v_promo_base)
      else 0 end
  );
end $$;
revoke all on function public.price_cart(jsonb, text, integer) from public;
grant execute on function public.price_cart(jsonb, text, integer) to anon, authenticated;

-- 5 ── returns refund what a line actually cost ───────────────────────────────
CREATE OR REPLACE FUNCTION public._validate_return(p_order_id uuid, p_items jsonb)
 RETURNS TABLE(order_item_id uuid, variant_id uuid, quantity integer, credit integer, o_branch uuid, o_subtotal integer, o_total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role := public.current_app_role();
  v_order record;
  v_line record;
  v_req record;
  v_already integer;
  v_lines_total integer;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status not in ('completed', 'delivered') then
    raise exception 'order status % cannot be returned', v_order.status;
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'nothing to return';
  end if;
  select coalesce(sum(line_total_usd_cents), 0) into v_lines_total from public.order_items where order_id = p_order_id;
  -- a look sold only together comes back whole: every piece of its group that is
  -- still returnable must be in this return
  if exists (
    select 1
    from public.order_items oi
    join public.outfits o on o.id = oi.outfit_id and o.sell_mode = 'exclusive'
    where oi.order_id = p_order_id
      and oi.outfit_group in (
        select x.outfit_group from public.order_items x
        where x.id in (select (i->>'order_item_id')::uuid from jsonb_array_elements(p_items) i)
          and x.outfit_group is not null)
      and oi.quantity - coalesce((select sum(ri.quantity) from public.order_return_items ri where ri.order_item_id = oi.id), 0) > 0
      and coalesce((select (i->>'quantity')::int from jsonb_array_elements(p_items) i where (i->>'order_item_id')::uuid = oi.id), 0)
          < oi.quantity - coalesce((select sum(ri.quantity) from public.order_return_items ri where ri.order_item_id = oi.id), 0)
  ) then
    raise exception 'this look is returned complete';
  end if;
  -- the returnable check reads past returns only, so a line listed twice would be credited twice
  if (select count(distinct i->>'order_item_id') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then
    raise exception 'each item can appear only once in a return';
  end if;

  for v_req in
    select (i->>'order_item_id')::uuid as oi, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_items) i
  loop
    if v_req.qty is null or v_req.qty <= 0 then raise exception 'invalid quantity'; end if;
    select * into v_line from public.order_items where id = v_req.oi and order_id = p_order_id;
    if v_line is null then raise exception 'item not on this order'; end if;
    select coalesce(sum(ri.quantity), 0) into v_already
    from public.order_return_items ri
    join public.order_returns r on r.id = ri.return_id
    where ri.order_item_id = v_req.oi;
    if v_req.qty > v_line.quantity - v_already then
      raise exception 'quantity exceeds what remains returnable for %', coalesce(v_line.sku, v_line.name_en);
    end if;
    order_item_id := v_req.oi;
    variant_id := v_line.variant_id;
    quantity := v_req.qty;
    -- the order's discounts spread over what the lines actually cost: a line's own
    -- discount (POS line discount, outfit share) is already in its line total, so
    -- the ratio is taken against the sum of line totals, not the gross subtotal
    credit := public._return_credit(
      v_line.line_total_usd_cents, v_line.quantity, v_req.qty,
      v_lines_total, v_order.total_usd_cents - coalesce(v_order.delivery_usd_cents, 0)
    );
    o_branch := v_order.branch_id;
    o_subtotal := v_order.subtotal_usd_cents;
    o_total := v_order.total_usd_cents - coalesce(v_order.delivery_usd_cents, 0);
    return next;
  end loop;
end;
$function$;

-- a returned line remembers its outfit (copied from the sold line)
create or replace function public.order_return_items_outfit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select oi.outfit_id, oi.outfit_group,
         round(oi.outfit_discount_cents::numeric * new.quantity / greatest(oi.quantity, 1))::integer
  into new.outfit_id, new.outfit_group, new.outfit_discount_cents
  from public.order_items oi where oi.id = new.order_item_id;
  new.outfit_discount_cents := coalesce(new.outfit_discount_cents, 0);
  return new;
end $$;
create trigger order_return_items_outfit before insert on public.order_return_items
  for each row execute function public.order_return_items_outfit();
