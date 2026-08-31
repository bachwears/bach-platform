-- Orders & sales foundation: customers, unified POS/online orders with
-- dual-currency capture, mixed-cash payments, and an atomic POS checkout.

create type public.order_channel as enum ('pos', 'online');

-- The 10-status lifecycle (CLAUDE.md §8). POS sales jump straight to completed.
create type public.order_status as enum (
  'pending', 'confirmed', 'picking', 'packed', 'shipped',
  'delivered', 'completed', 'cancelled', 'returned', 'exchanged'
);

-- Customers are distinct from profiles (profiles = staff only).
-- Walk-ins need nothing but a row; loyal accounts link auth_user_id.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text,
  phone text unique,
  email text unique,
  birthday date,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  channel public.order_channel not null,
  status public.order_status not null default 'pending',
  branch_id uuid not null references public.branches (id),
  customer_id uuid references public.customers (id),
  cashier_id uuid references public.profiles (id),
  -- Money: USD cents is canonical; the LBP rate is captured per transaction.
  lbp_per_usd numeric(14, 2) not null check (lbp_per_usd > 0),
  subtotal_usd_cents integer not null check (subtotal_usd_cents >= 0),
  discount_usd_cents integer not null default 0 check (discount_usd_cents >= 0),
  tva_usd_cents integer not null default 0 check (tva_usd_cents >= 0),
  tva_rate_basis_points integer not null default 0,
  prices_include_tva boolean not null default true,
  total_usd_cents integer not null check (total_usd_cents >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_branch_created_idx on public.orders (branch_id, created_at desc);
create index orders_status_idx on public.orders (status) where status not in ('completed', 'cancelled');
create index orders_customer_idx on public.orders (customer_id) where customer_id is not null;

-- Snapshots survive later catalog edits: keep names, sku, unit price at sale time.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  sku text,
  name_en text not null,
  name_ar text not null,
  size text not null,
  color_en text not null,
  color_ar text not null,
  quantity integer not null check (quantity > 0),
  unit_price_usd_cents integer not null check (unit_price_usd_cents >= 0),
  line_total_usd_cents integer not null check (line_total_usd_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- One order can be paid in mixed tender (part USD bills, part LBP).
create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method public.payment_kind not null,
  currency text not null check (currency in ('USD', 'LBP')),
  amount_minor bigint not null check (amount_minor > 0),
  usd_equiv_cents integer not null check (usd_equiv_cents > 0),
  created_at timestamptz not null default now()
);
create index order_payments_order_idx on public.order_payments (order_id);

-- RLS ---------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payments enable row level security;

create policy "staff read customers" on public.customers
  for select to authenticated using (public.is_staff());
create policy "staff manage customers" on public.customers
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'cashier', 'support_agent'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'cashier', 'support_agent'));
create policy "customer reads own record" on public.customers
  for select to authenticated using (auth_user_id = auth.uid());

create policy "staff read orders" on public.orders
  for select to authenticated using (public.is_staff());
create policy "customer reads own orders" on public.orders
  for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "managers update orders" on public.orders
  for update to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent'));

create policy "staff read order items" on public.order_items
  for select to authenticated using (public.is_staff());
create policy "customer reads own order items" on public.order_items
  for select to authenticated
  using (order_id in (
    select o.id from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.auth_user_id = auth.uid()
  ));

create policy "staff read order payments" on public.order_payments
  for select to authenticated using (public.is_staff());

-- Writes to orders/items/payments happen only through pos_checkout (definer).

-- Atomic POS checkout ------------------------------------------------------
-- Creates order + items + payments + stock movements in one transaction.
-- p_items:    [{"variant_id": uuid, "quantity": int}, ...]
-- p_payments: [{"currency": "USD"|"LBP", "amount_minor": int}, ...]  (cash)
create or replace function public.pos_checkout(
  p_branch_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount_basis_points integer default 0,
  p_customer_id uuid default null,
  p_note text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_rate numeric(14, 2);
  v_tva record;
  v_item record;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_tva_cents integer := 0;
  v_total integer := 0;
  v_paid_usd integer := 0;
  v_unit_price integer;
  v_available integer;
  v_pay record;
  v_usd_equiv integer;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  if p_discount_basis_points < 0 or p_discount_basis_points > 10000 then
    raise exception 'invalid discount';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'empty cart';
  end if;

  select lbp_per_usd into v_rate
  from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then
    raise exception 'no exchange rate configured';
  end if;

  select enabled, rate_basis_points, prices_include_tva into v_tva
  from public.tva_settings limit 1;

  -- Price and validate every line first (locks stock rows).
  create temp table _lines on commit drop as
  select
    (i->>'variant_id')::uuid as variant_id,
    (i->>'quantity')::int as quantity
  from jsonb_array_elements(p_items) i;

  if exists (select 1 from _lines where quantity is null or quantity <= 0) then
    raise exception 'invalid quantity';
  end if;

  for v_item in
    select l.variant_id, l.quantity,
           pv.sku, pv.size, pv.color_en, pv.color_ar, pv.price_usd_cents_override,
           p.name_en, p.name_ar, p.price_usd_cents, p.sale_price_usd_cents
    from _lines l
    join public.product_variants pv on pv.id = l.variant_id and pv.is_active
    join public.products p on p.id = pv.product_id
  loop
    v_unit_price := coalesce(
      v_item.price_usd_cents_override,
      least(coalesce(v_item.sale_price_usd_cents, v_item.price_usd_cents), v_item.price_usd_cents)
    );

    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.variant_id and branch_id = p_branch_id
    for update;

    if coalesce(v_available, 0) < v_item.quantity then
      raise exception 'insufficient stock for %', coalesce(v_item.sku, v_item.name_en);
    end if;

    v_subtotal := v_subtotal + v_unit_price * v_item.quantity;
  end loop;

  if (select count(*) from _lines) <> (
    select count(*) from _lines l
    join public.product_variants pv on pv.id = l.variant_id and pv.is_active
  ) then
    raise exception 'unknown or inactive variant in cart';
  end if;

  v_discount := round((v_subtotal::numeric * p_discount_basis_points) / 10000);
  v_total := v_subtotal - v_discount;

  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      -- Extract the TVA portion contained in the total (for reporting).
      v_tva_cents := v_total - round(v_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_total::numeric * v_tva.rate_basis_points / 10000);
      v_total := v_total + v_tva_cents;
    end if;
  end if;

  -- Validate payments cover the total (tolerance: 5 cents for LBP rounding).
  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p
  loop
    if v_pay.currency not in ('USD', 'LBP') or v_pay.amount_minor is null or v_pay.amount_minor <= 0 then
      raise exception 'invalid payment line';
    end if;
    v_usd_equiv := case v_pay.currency
      when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer
    end;
    v_paid_usd := v_paid_usd + v_usd_equiv;
  end loop;

  if v_paid_usd < v_total - 5 then
    raise exception 'payment % does not cover total %', v_paid_usd, v_total;
  end if;

  insert into public.orders (
    channel, status, branch_id, customer_id, cashier_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, note
  ) values (
    'pos', 'completed', p_branch_id, p_customer_id, auth.uid(), v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, p_note
  ) returning id, number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar,
    quantity, unit_price_usd_cents, line_total_usd_cents
  )
  select
    v_order_id, l.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
    l.quantity,
    coalesce(pv.price_usd_cents_override,
             least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents)),
    coalesce(pv.price_usd_cents_override,
             least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents)) * l.quantity
  from _lines l
  join public.product_variants pv on pv.id = l.variant_id
  join public.products p on p.id = pv.product_id;

  insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
  select
    v_order_id, 'cash',
    p->>'currency',
    (p->>'amount_minor')::bigint,
    case p->>'currency'
      when 'USD' then (p->>'amount_minor')::integer
      else round(((p->>'amount_minor')::numeric / v_rate) * 100)::integer
    end
  from jsonb_array_elements(p_payments) p;

  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select l.variant_id, p_branch_id, -l.quantity, 'sale', v_order_id, auth.uid()
  from _lines l;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text) from public;
grant execute on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text) to authenticated;
