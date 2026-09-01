-- Size expansion for the imported one-size catalogue: split an 'OS' variant
-- into a real size run with per-size shelf quantities. The retired OS variant
-- keeps the physical tag barcode (unique constraint) and stays as a scan
-- alias — the POS resolves it to the product's active sizes.

create or replace function public.expand_variant_sizes(
  p_product_id uuid,
  p_branch_id uuid,
  p_items jsonb -- [{size, quantity}]
) returns table (created integer, total_quantity integer)
language plpgsql security definer set search_path = public as $$
declare
  v_os public.product_variants%rowtype;
  v_variant_count integer;
  v_item jsonb;
  v_size text;
  v_qty integer;
  v_new_id uuid;
  v_created integer := 0;
  v_total integer := 0;
  v_os_stock integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'no sizes given';
  end if;

  select count(*) into v_variant_count from public.product_variants where product_id = p_product_id;
  select * into v_os
  from public.product_variants
  where product_id = p_product_id and size = 'OS'
  for update;
  if v_os.id is null or v_variant_count <> 1 then
    raise exception 'product is not a single one-size variant';
  end if;

  -- Distinct, valid sizes only.
  if (select count(*) from jsonb_array_elements(p_items) i) <> (
    select count(distinct upper(trim(i->>'size'))) from jsonb_array_elements(p_items) i
  ) then
    raise exception 'duplicate size';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_size := upper(trim(v_item->>'size'));
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_size = '' or v_size = 'OS' or length(v_size) > 6 then
      raise exception 'invalid size %', v_size;
    end if;
    if v_qty < 0 then
      raise exception 'invalid quantity';
    end if;

    insert into public.product_variants (
      product_id, size, color_code, color_en, color_ar,
      sku, barcode, price_usd_cents_override, is_active
    ) values (
      p_product_id, v_size, v_os.color_code, v_os.color_en, v_os.color_ar,
      v_os.sku || '-' || v_size, null, v_os.price_usd_cents_override, true
    ) returning id into v_new_id;

    if v_qty > 0 then
      insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, note, created_by)
      values (v_new_id, p_branch_id, v_qty, 'count', p_product_id, 'size expansion', auth.uid());
      v_total := v_total + v_qty;
    end if;
    v_created := v_created + 1;
  end loop;

  -- Retire the OS variant: zero its stock, keep the barcode as a scan alias.
  select coalesce(quantity, 0) into v_os_stock
  from public.inventory_levels
  where variant_id = v_os.id and branch_id = p_branch_id
  for update;
  if coalesce(v_os_stock, 0) > 0 then
    insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, note, created_by)
    values (v_os.id, p_branch_id, -v_os_stock, 'count', p_product_id, 'size expansion: OS retired', auth.uid());
  end if;
  update public.product_variants set is_active = false where id = v_os.id;

  return query select v_created, v_total;
end;
$$;

revoke all on function public.expand_variant_sizes(uuid, uuid, jsonb) from public;
grant execute on function public.expand_variant_sizes(uuid, uuid, jsonb) to authenticated;
