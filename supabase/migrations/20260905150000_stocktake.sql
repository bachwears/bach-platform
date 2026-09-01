-- Guided stocktake (Deep-Research gate): count the shelf, review variances,
-- apply adjustments as 'count' movements through the existing ledger.

create type public.stocktake_status as enum ('open', 'completed', 'cancelled');

create table public.stocktakes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  status public.stocktake_status not null default 'open',
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id)
);

-- One open stocktake per branch at a time.
create unique index stocktakes_one_open_idx on public.stocktakes (branch_id) where status = 'open';

create table public.stocktake_counts (
  stocktake_id uuid not null references public.stocktakes (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  counted integer not null check (counted >= 0),
  -- On-hand quantity when the item was (last) counted — the variance baseline.
  system_qty integer not null,
  counted_by uuid not null references public.profiles (id),
  counted_at timestamptz not null default now(),
  primary key (stocktake_id, variant_id)
);

alter table public.stocktakes enable row level security;
alter table public.stocktake_counts enable row level security;

create policy "stocktakes_staff_read" on public.stocktakes for select using (public.is_staff());
create policy "stocktake_counts_staff_read" on public.stocktake_counts for select using (public.is_staff());
-- All writes go through the definer RPCs below.

create or replace function public.stocktake_start(p_branch_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  select id into v_id from public.stocktakes where branch_id = p_branch_id and status = 'open';
  if v_id is not null then
    return v_id; -- resume the open session
  end if;
  begin
    insert into public.stocktakes (branch_id, note, created_by)
    values (p_branch_id, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
    returning id into v_id;
  exception when unique_violation then
    -- Concurrent open (e.g. two devices, or React double-mount): reuse it.
    select id into v_id from public.stocktakes where branch_id = p_branch_id and status = 'open';
  end;
  return v_id;
end;
$$;

-- Record (or overwrite) a count for one variant. Tally mode is handled by the
-- client sending the accumulated number.
create or replace function public.stocktake_count(
  p_stocktake_id uuid, p_variant_id uuid, p_counted integer
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_take public.stocktakes%rowtype;
  v_system integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  select * into v_take from public.stocktakes where id = p_stocktake_id;
  if v_take.id is null or v_take.status <> 'open' then
    raise exception 'stocktake is not open';
  end if;
  if p_counted is null or p_counted < 0 then
    raise exception 'invalid count';
  end if;
  if not exists (select 1 from public.product_variants where id = p_variant_id) then
    raise exception 'unknown variant';
  end if;

  select coalesce(quantity, 0) into v_system
  from public.inventory_levels
  where variant_id = p_variant_id and branch_id = v_take.branch_id;

  insert into public.stocktake_counts (stocktake_id, variant_id, counted, system_qty, counted_by)
  values (p_stocktake_id, p_variant_id, p_counted, coalesce(v_system, 0), auth.uid())
  on conflict (stocktake_id, variant_id) do update
    set counted = excluded.counted,
        system_qty = excluded.system_qty,
        counted_by = excluded.counted_by,
        counted_at = now();
end;
$$;

-- Apply: adjust stock to the counted values (delta against the CURRENT
-- quantity, so sales rung during the count are not clobbered when the
-- shelf count already reflected them). Managers only.
create or replace function public.stocktake_apply(p_stocktake_id uuid)
returns table (adjusted integer, total_delta integer)
language plpgsql security definer set search_path = public as $$
declare
  v_take public.stocktakes%rowtype;
  v_row record;
  v_current integer;
  v_delta integer;
  v_adjusted integer := 0;
  v_total integer := 0;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'only a manager can apply a stocktake';
  end if;
  select * into v_take from public.stocktakes where id = p_stocktake_id for update;
  if v_take.id is null or v_take.status <> 'open' then
    raise exception 'stocktake is not open';
  end if;

  for v_row in
    select c.variant_id, c.counted, c.system_qty
    from public.stocktake_counts c
    where c.stocktake_id = p_stocktake_id
  loop
    select coalesce(quantity, 0) into v_current
    from public.inventory_levels
    where variant_id = v_row.variant_id and branch_id = v_take.branch_id
    for update;

    -- Movements since this item was counted (e.g. a sale mid-stocktake)
    -- shift the target by the same amount the shelf shifted.
    v_delta := v_row.counted - v_row.system_qty;
    if v_delta <> 0 then
      insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, note, created_by)
      values (
        v_row.variant_id, v_take.branch_id, v_delta, 'count', p_stocktake_id,
        format('stocktake: counted %s vs system %s', v_row.counted, v_row.system_qty),
        auth.uid()
      );
      v_adjusted := v_adjusted + 1;
      v_total := v_total + v_delta;
    end if;
  end loop;

  update public.stocktakes
  set status = 'completed', completed_at = now(), completed_by = auth.uid()
  where id = p_stocktake_id;

  return query select v_adjusted, v_total;
end;
$$;

create or replace function public.stocktake_cancel(p_stocktake_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'only a manager can cancel a stocktake';
  end if;
  update public.stocktakes
  set status = 'cancelled', completed_at = now(), completed_by = auth.uid()
  where id = p_stocktake_id and status = 'open';
end;
$$;

revoke all on function public.stocktake_start(uuid, text) from public;
revoke all on function public.stocktake_count(uuid, uuid, integer) from public;
revoke all on function public.stocktake_apply(uuid) from public;
revoke all on function public.stocktake_cancel(uuid) from public;
grant execute on function public.stocktake_start(uuid, text) to authenticated;
grant execute on function public.stocktake_count(uuid, uuid, integer) to authenticated;
grant execute on function public.stocktake_apply(uuid) to authenticated;
grant execute on function public.stocktake_cancel(uuid) to authenticated;
