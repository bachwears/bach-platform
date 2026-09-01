-- Purchase orders (Deep-Research gate): suppliers → PO → receive into stock.
-- Receiving writes 'purchase' movements through the inventory ledger and
-- refreshes product cost (last-cost method) for margin reporting.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create type public.po_status as enum ('draft', 'ordered', 'partial', 'received', 'cancelled');

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  supplier_id uuid not null references public.suppliers (id),
  branch_id uuid not null references public.branches (id),
  status public.po_status not null default 'draft',
  note text,
  expected_at date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchase_orders_status_idx on public.purchase_orders (status, created_at desc);

create table public.purchase_order_items (
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost_usd_cents integer check (unit_cost_usd_cents >= 0),
  primary key (po_id, variant_id)
);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy "suppliers_staff_read" on public.suppliers for select using (public.is_staff());
create policy "po_staff_read" on public.purchase_orders for select using (public.is_staff());
create policy "po_items_staff_read" on public.purchase_order_items for select using (public.is_staff());

-- Suppliers are simple enough for direct manager writes.
create policy "suppliers_manager_write" on public.suppliers
  for all using (public.current_app_role() in ('super_admin', 'store_manager', 'inventory_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'inventory_manager'));

create trigger purchase_orders_touch
  before update on public.purchase_orders
  for each row execute function public.touch_updated_at();

-- Create a PO (draft) with its lines in one call.
create or replace function public.po_create(
  p_supplier_id uuid,
  p_branch_id uuid,
  p_items jsonb, -- [{variant_id, quantity, unit_cost_usd_cents}]
  p_note text default null,
  p_expected_at date default null
) returns table (po_id uuid, po_number bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_number bigint;
  v_item jsonb;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty purchase order';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and is_active) then
    raise exception 'unknown supplier';
  end if;

  insert into public.purchase_orders (supplier_id, branch_id, note, expected_at, created_by)
  values (p_supplier_id, p_branch_id, nullif(trim(coalesce(p_note, '')), ''), p_expected_at, auth.uid())
  returning id, number into v_id, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'quantity')::integer, 0) < 1 then
      raise exception 'invalid quantity';
    end if;
    if not exists (select 1 from public.product_variants where id = (v_item->>'variant_id')::uuid) then
      raise exception 'unknown variant';
    end if;
    insert into public.purchase_order_items (po_id, variant_id, quantity_ordered, unit_cost_usd_cents)
    values (
      v_id,
      (v_item->>'variant_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_cost_usd_cents')::integer
    );
  end loop;

  return query select v_id, v_number;
end;
$$;

-- draft → ordered
create or replace function public.po_place(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  update public.purchase_orders set status = 'ordered'
  where id = p_po_id and status = 'draft';
  if not found then
    raise exception 'only a draft can be placed';
  end if;
end;
$$;

create or replace function public.po_cancel(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  update public.purchase_orders set status = 'cancelled'
  where id = p_po_id and status in ('draft', 'ordered');
  if not found then
    raise exception 'cannot cancel at this stage';
  end if;
end;
$$;

-- Receive a delivery (full or partial). Stock lands as 'purchase' movements;
-- product cost refreshes to the latest received unit cost (last-cost method).
create or replace function public.po_receive(
  p_po_id uuid,
  p_items jsonb -- [{variant_id, quantity}]
) returns table (received_lines integer, po_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_item jsonb;
  v_line public.purchase_order_items%rowtype;
  v_qty integer;
  v_received integer := 0;
  v_open integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_po from public.purchase_orders where id = p_po_id for update;
  if v_po.id is null or v_po.status not in ('ordered', 'partial') then
    raise exception 'purchase order is not receivable';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'nothing to receive';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty < 1 then
      raise exception 'invalid quantity';
    end if;
    select * into v_line
    from public.purchase_order_items
    where po_id = p_po_id and variant_id = (v_item->>'variant_id')::uuid
    for update;
    if v_line.po_id is null then
      raise exception 'variant not on this purchase order';
    end if;
    if v_line.quantity_received + v_qty > v_line.quantity_ordered then
      raise exception 'receiving more than ordered for a line';
    end if;

    update public.purchase_order_items
    set quantity_received = quantity_received + v_qty
    where po_id = p_po_id and variant_id = v_line.variant_id;

    insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
    values (v_line.variant_id, v_po.branch_id, v_qty, 'purchase', p_po_id, auth.uid());

    if v_line.unit_cost_usd_cents is not null then
      update public.products p
      set cost_usd_cents = v_line.unit_cost_usd_cents
      from public.product_variants pv
      where pv.id = v_line.variant_id and p.id = pv.product_id;
    end if;

    v_received := v_received + 1;
  end loop;

  select count(*) into v_open
  from public.purchase_order_items
  where po_id = p_po_id and quantity_received < quantity_ordered;

  update public.purchase_orders
  set status = (case when v_open = 0 then 'received' else 'partial' end)::public.po_status
  where id = p_po_id;

  return query
  select v_received, (select status::text from public.purchase_orders where id = p_po_id);
end;
$$;

revoke all on function public.po_create(uuid, uuid, jsonb, text, date) from public;
revoke all on function public.po_place(uuid) from public;
revoke all on function public.po_cancel(uuid) from public;
revoke all on function public.po_receive(uuid, jsonb) from public;
grant execute on function public.po_create(uuid, uuid, jsonb, text, date) to authenticated;
grant execute on function public.po_place(uuid) to authenticated;
grant execute on function public.po_cancel(uuid) to authenticated;
grant execute on function public.po_receive(uuid, jsonb) to authenticated;
