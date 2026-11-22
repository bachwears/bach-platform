-- When each size/colour ran out (founder 2026-11-22): the storefront takes a
-- colour off the site once every one of its sizes has been sold out for 30 days
-- (apps/storefront/lib/card.ts, retiredColours). Stock coming back clears it.
-- product_variants.sold_out_since = when sellable stock (quantity − reserved,
-- all branches) last hit 0; null while any is left.

alter table public.product_variants add column if not exists sold_out_since timestamptz;

create or replace function public.sync_variant_sold_out(p_variant uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_available bigint;
begin
  select coalesce(sum(greatest(quantity - coalesce(reserved, 0), 0)), 0) into v_available
  from public.inventory_levels where variant_id = p_variant;
  if v_available > 0 then
    update public.product_variants set sold_out_since = null where id = p_variant and sold_out_since is not null;
  else
    update public.product_variants set sold_out_since = now() where id = p_variant and sold_out_since is null;
  end if;
end;
$function$;
revoke all on function public.sync_variant_sold_out(uuid) from public, anon, authenticated;

-- the stock trigger from 20261120100000 also stamps the variant
create or replace function public._inventory_sync_status()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_variant uuid := coalesce(new.variant_id, old.variant_id);
  v_product uuid;
begin
  perform public.sync_variant_sold_out(v_variant);
  select product_id into v_product from public.product_variants where id = v_variant;
  if v_product is not null then perform public.sync_product_stock_status(v_product); end if;
  return null;
end;
$function$;

-- today's sold-out variants: stamped with their last stock movement (the sale
-- or count that emptied them), else now
update public.product_variants v
set sold_out_since = coalesce(
  (select max(m.created_at) from public.inventory_movements m where m.variant_id = v.id),
  now()
)
where coalesce((
  select sum(greatest(il.quantity - coalesce(il.reserved, 0), 0))
  from public.inventory_levels il where il.variant_id = v.id
), 0) <= 0;
