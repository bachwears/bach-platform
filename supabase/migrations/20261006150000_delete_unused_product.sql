-- Delete a product that never did anything (founder request 2026-10-06).
--
-- A product with history — sold, returned, ordered from a supplier, counted,
-- or with stock that moved — can't be deleted (its orders, invoices and stock
-- records point at it); those get archived instead. A product with none of
-- that (a mistaken entry, a test, a duplicate) can now be removed for good.
--
-- delete_product(p_id, p_check_only):
--   p_check_only = true  → only reports what blocks it: {ok, blockers{...}}
--   p_check_only = false → deletes when nothing blocks it; variants, photos
--                          rows, collections, seasons, pairings and wishlists
--                          go with it (their FKs cascade). Photo files stay in
--                          storage. Logged in staff_audit_log.
-- Super admin and store manager only.

create or replace function public.delete_product(p_id uuid, p_check_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
  v_blockers jsonb;
  v_ok boolean;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager') then
    raise exception 'بس المدير العام أو مدير المحل فيهم يمحوا منتج.';
  end if;

  select name_en, slug into v_name, v_slug from public.products where id = p_id;
  if v_name is null then
    raise exception 'المنتج مش موجود.';
  end if;

  select jsonb_build_object(
    'orders', (select count(*) from public.order_items i join public.product_variants v on v.id = i.variant_id where v.product_id = p_id),
    'returns', (select count(*) from public.order_return_items i join public.product_variants v on v.id = i.variant_id where v.product_id = p_id),
    'purchases', (select count(*) from public.purchase_order_items i join public.product_variants v on v.id = i.variant_id where v.product_id = p_id),
    'stock_moves', (select count(*) from public.inventory_movements m join public.product_variants v on v.id = m.variant_id where v.product_id = p_id),
    'stock_counts', (select count(*) from public.stocktake_counts c join public.product_variants v on v.id = c.variant_id where v.product_id = p_id),
    'in_stock', (select coalesce(sum(l.quantity + l.reserved), 0) from public.inventory_levels l join public.product_variants v on v.id = l.variant_id where v.product_id = p_id)
  ) into v_blockers;

  v_ok := not exists (select 1 from jsonb_each_text(v_blockers) e where e.value::numeric > 0);

  if p_check_only or not v_ok then
    return jsonb_build_object('ok', v_ok, 'deleted', false, 'blockers', v_blockers);
  end if;

  delete from public.products where id = p_id;

  insert into public.staff_audit_log (actor_id, action, target_id, detail)
  values (auth.uid(), 'product_deleted', p_id, jsonb_build_object('name_en', v_name, 'slug', v_slug));

  return jsonb_build_object('ok', true, 'deleted', true, 'blockers', v_blockers);
end;
$$;

revoke all on function public.delete_product(uuid, boolean) from public, anon;
grant execute on function public.delete_product(uuid, boolean) to authenticated;
