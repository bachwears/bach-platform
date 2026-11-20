-- Sold-out products leave the storefront by themselves (founder 2026-11-20):
-- a published product with nothing left to sell (no stock, after reservations,
-- on any active size/colour in any branch) is archived and flagged
-- auto_archived. When stock comes back (a delivery, a return, a cancelled
-- order's reservation released) it is published again. A product someone
-- archived or drafted by hand is never touched: changing status by hand clears
-- the flag.

alter table public.products add column if not exists auto_archived boolean not null default false;

create or replace function public.sync_product_stock_status(p_product uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_status text;
  v_auto boolean;
  v_available bigint;
begin
  select status::text, auto_archived into v_status, v_auto from public.products where id = p_product;
  if v_status is null then return; end if;
  if not (v_status = 'published' or (v_status = 'archived' and v_auto)) then return; end if;

  select coalesce(sum(greatest(il.quantity - coalesce(il.reserved, 0), 0)), 0) into v_available
  from public.product_variants v
  join public.inventory_levels il on il.variant_id = v.id
  where v.product_id = p_product and v.is_active;

  -- marks the change as ours, so the hand-edit trigger below keeps the flag
  perform set_config('bach.auto_archive', 'on', true);
  if v_status = 'published' and v_available <= 0 then
    update public.products set status = 'archived', auto_archived = true where id = p_product;
  elsif v_status = 'archived' and v_auto and v_available > 0 then
    update public.products set status = 'published', auto_archived = false where id = p_product;
  end if;
  perform set_config('bach.auto_archive', 'off', true);
end;
$function$;
revoke all on function public.sync_product_stock_status(uuid) from public, anon, authenticated;

-- stock moved: re-check the product it belongs to
create or replace function public._inventory_sync_status()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_product uuid;
begin
  select product_id into v_product from public.product_variants
  where id = coalesce(new.variant_id, old.variant_id);
  if v_product is not null then perform public.sync_product_stock_status(v_product); end if;
  return null;
end;
$function$;

drop trigger if exists inventory_levels_sync_status on public.inventory_levels;
create trigger inventory_levels_sync_status
  after insert or update of quantity, reserved or delete on public.inventory_levels
  for each row execute function public._inventory_sync_status();

-- a size/colour switched on or off changes what's left to sell
create or replace function public._variant_sync_status()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.sync_product_stock_status(coalesce(new.product_id, old.product_id));
  return null;
end;
$function$;

drop trigger if exists product_variants_sync_status on public.product_variants;
create trigger product_variants_sync_status
  after update of is_active on public.product_variants
  for each row when (old.is_active is distinct from new.is_active)
  execute function public._variant_sync_status();

-- a status set by hand (MGMT, bulk edit) is the team's call: drop the auto flag
create or replace function public._products_manual_status()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.status is distinct from old.status and coalesce(current_setting('bach.auto_archive', true), 'off') <> 'on' then
    new.auto_archived := false;
  end if;
  return new;
end;
$function$;

drop trigger if exists products_manual_status on public.products;
create trigger products_manual_status
  before update of status on public.products
  for each row execute function public._products_manual_status();

-- today's sold-out published products
do $$
declare r record;
begin
  for r in select id from public.products where status = 'published' loop
    perform public.sync_product_stock_status(r.id);
  end loop;
end $$;
