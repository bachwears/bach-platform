-- Customer wallet (founder spec 2026-09-16):
--   · returns/exchanges can credit the wallet instead of cash
--   · top-ups via Whish: amount + receipt no → MGMT confirms (SLA 6h,
--     WhatsApp if late) → balance credited
--   · orders fully prepaid from the wallet get 10% off (the Whish
--     prepay incentive)
-- Plus: granular Accessories categories (Boots / Scarves / Hats & Caps).

-- ── balance + ledgers ────────────────────────────────────────────────────
alter table public.customers
  add column balance_usd_cents integer not null default 0 check (balance_usd_cents >= 0);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  delta_usd_cents integer not null check (delta_usd_cents <> 0),
  kind text not null check (kind in ('whish_topup', 'return_credit', 'order_payment', 'adjustment')),
  reference_id uuid,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index wallet_tx_customer_idx on public.wallet_transactions (customer_id, created_at desc);

create table public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount_usd_cents integer not null check (amount_usd_cents between 100 and 100000000),
  receipt_no text not null check (length(trim(receipt_no)) between 3 and 60),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index wallet_topups_status_idx on public.wallet_topups (status, created_at);

alter table public.wallet_transactions enable row level security;
alter table public.wallet_topups enable row level security;

create policy wallet_tx_own_read on public.wallet_transactions for select using (
  exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  or public.current_app_role() in ('super_admin', 'store_manager', 'cashier', 'support_agent')
);
create policy wallet_topups_own_read on public.wallet_topups for select using (
  exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid())
  or public.current_app_role() in ('super_admin', 'store_manager', 'cashier', 'support_agent')
);
-- Writes go through the RPCs below only.

-- ── customer requests a Whish top-up ─────────────────────────────────────
create or replace function public.request_wallet_topup(p_amount_usd numeric, p_receipt text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_customer uuid;
  v_id uuid;
begin
  select id into v_customer from public.customers where auth_user_id = auth.uid();
  if v_customer is null then raise exception 'sign in first'; end if;
  if (select count(*) from public.wallet_topups where customer_id = v_customer and status = 'pending') >= 3 then
    raise exception 'too many pending top-ups';
  end if;
  insert into public.wallet_topups (customer_id, amount_usd_cents, receipt_no)
  values (v_customer, round(p_amount_usd * 100)::integer, trim(p_receipt))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.request_wallet_topup(numeric, text) from public;
grant execute on function public.request_wallet_topup(numeric, text) to authenticated;

-- ── staff decides a top-up (MGMT, SLA 6h) ────────────────────────────────
create or replace function public.decide_wallet_topup(p_topup_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_t public.wallet_topups;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_t from public.wallet_topups where id = p_topup_id for update;
  if v_t.id is null then raise exception 'top-up not found'; end if;
  if v_t.status <> 'pending' then raise exception 'already decided'; end if;

  update public.wallet_topups
  set status = case when p_approve then 'confirmed' else 'rejected' end,
      decided_by = auth.uid(), decided_at = now()
  where id = p_topup_id;

  if p_approve then
    update public.customers
    set balance_usd_cents = balance_usd_cents + v_t.amount_usd_cents, updated_at = now()
    where id = v_t.customer_id;
    insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note, created_by)
    values (v_t.customer_id, v_t.amount_usd_cents, 'whish_topup', v_t.id, 'Whish receipt ' || v_t.receipt_no, auth.uid());
  end if;
end;
$$;
revoke all on function public.decide_wallet_topup(uuid, boolean) from public;
grant execute on function public.decide_wallet_topup(uuid, boolean) to authenticated;

-- ── staff credits a wallet (returns/exchanges → store credit) ────────────
create or replace function public.credit_wallet(
  p_customer_id uuid, p_amount_usd_cents integer, p_kind text, p_note text default null, p_reference uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  if p_kind not in ('return_credit', 'adjustment') then raise exception 'invalid kind'; end if;
  if p_amount_usd_cents is null or p_amount_usd_cents = 0 then raise exception 'invalid amount'; end if;
  update public.customers
  set balance_usd_cents = balance_usd_cents + p_amount_usd_cents, updated_at = now()
  where id = p_customer_id;
  if not found then raise exception 'customer not found'; end if;
  insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note, created_by)
  values (p_customer_id, p_amount_usd_cents, p_kind, p_reference, p_note, auth.uid());
end;
$$;
revoke all on function public.credit_wallet(uuid, integer, text, text, uuid) from public;
grant execute on function public.credit_wallet(uuid, integer, text, text, uuid) to authenticated;

-- ── checkout v3: full-wallet prepay with 10% off ─────────────────────────
drop function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text);

create or replace function public.storefront_checkout(
  p_items jsonb,
  p_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_note text default null,
  p_email text default null,
  p_promocode text default null,
  p_payment_method text default 'cod',
  p_use_wallet boolean default false
)
returns table (order_id uuid, order_number bigint, discount_usd_cents integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_rate numeric(14, 2);
  v_tva record;
  v_branch uuid;
  v_customer uuid;
  v_item record;
  v_unit integer;
  v_available integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_wallet_discount integer := 0;
  v_total integer;
  v_tva_cents integer := 0;
  v_order_id uuid;
  v_order_number bigint;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_promo_id uuid;
  v_check record;
  v_method public.payment_kind;
  v_balance integer;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if length(v_phone) < 7 or length(v_phone) > 15 then raise exception 'valid phone required'; end if;
  if coalesce(trim(p_city), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'delivery address required';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'valid email required';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) not between 1 and 20 then
    raise exception 'cart must have between 1 and 20 lines';
  end if;

  if p_use_wallet then
    -- Wallet prepay: identity comes from the session, never from the form.
    select id, balance_usd_cents into v_customer, v_balance
    from public.customers where auth_user_id = auth.uid();
    if v_customer is null then raise exception 'sign in to pay from your wallet'; end if;
    v_method := 'whish';
  else
    if p_payment_method not in ('cod', 'whish', 'stripe') then
      raise exception 'invalid payment method';
    end if;
    v_method := p_payment_method::public.payment_kind;
    if not exists (select 1 from public.payment_methods where kind = v_method and is_enabled) then
      raise exception 'payment method not available';
    end if;
  end if;

  select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then raise exception 'store temporarily unavailable'; end if;
  select id into v_branch from public.branches where is_active order by created_at limit 1;
  select enabled, rate_basis_points, prices_include_tva into v_tva from public.tva_settings limit 1;

  create temp table _web (variant_id uuid, quantity int, unit_price integer) on commit drop;
  for v_item in
    select (i->>'variant_id')::uuid as vid, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_items) i
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 10 then
      raise exception 'invalid quantity';
    end if;
    select coalesce(pv.price_usd_cents_override,
                    least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v_unit
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_item.vid and pv.is_active and p.status = 'published';
    if v_unit is null then raise exception 'item no longer available'; end if;

    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.vid and branch_id = v_branch
    for update;
    if coalesce(v_available, 0) < v_item.qty then
      raise exception 'insufficient stock';
    end if;

    insert into _web values (v_item.vid, v_item.qty, v_unit);
    v_subtotal := v_subtotal + v_unit * v_item.qty;
  end loop;

  if nullif(trim(coalesce(p_promocode, '')), '') is not null then
    select * into v_check from public.validate_promocode(p_promocode);
    if not v_check.valid then
      raise exception 'promocode: %', v_check.message;
    end if;
    select id into v_promo_id from public.promocodes where code = lower(trim(p_promocode));
    v_discount := case v_check.kind
      when 'percent' then round(v_subtotal::numeric * v_check.value / 100)::integer
      else least(v_check.value, v_subtotal)
    end;
  end if;

  -- Whish-prepaid incentive: 10% off the post-promo amount when the whole
  -- order is paid from the wallet.
  if p_use_wallet then
    v_wallet_discount := round((v_subtotal - v_discount)::numeric * 10 / 100)::integer;
    v_discount := v_discount + v_wallet_discount;
  end if;

  v_total := v_subtotal - v_discount;
  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      v_tva_cents := v_total - round(v_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_total::numeric * v_tva.rate_basis_points / 10000);
      v_total := v_total + v_tva_cents;
    end if;
  end if;

  if p_use_wallet and coalesce(v_balance, 0) < v_total then
    raise exception 'wallet balance does not cover this order';
  end if;

  if v_customer is null and auth.uid() is not null then
    select id into v_customer from public.customers where auth_user_id = auth.uid();
  end if;
  if v_customer is null then
    select id into v_customer from public.customers where phone = v_phone;
  end if;
  perform set_config('app.customer_guard_bypass', 'on', true);
  if v_customer is null then
    insert into public.customers (full_name, phone, email) values (trim(p_name), v_phone, v_email)
    returning id into v_customer;
  else
    update public.customers
    set full_name = coalesce(nullif(trim(p_name), ''), full_name),
        email = coalesce(email, v_email),
        updated_at = now()
    where id = v_customer;
  end if;
  perform set_config('app.customer_guard_bypass', '', true);

  insert into public.orders (
    channel, status, branch_id, customer_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents,
    note, ship_name, ship_phone, ship_city, ship_address, payment_method
  ) values (
    'online', case when p_use_wallet then 'confirmed' else 'pending' end, v_branch, v_customer, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total,
    nullif(trim(coalesce(p_note, '')), ''), trim(p_name), v_phone, trim(p_city), trim(p_address), v_method
  ) returning id, number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar,
    quantity, unit_price_usd_cents, line_total_usd_cents
  )
  select v_order_id, w.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
         w.quantity, w.unit_price, w.unit_price * w.quantity
  from _web w
  join public.product_variants pv on pv.id = w.variant_id
  join public.products p on p.id = pv.product_id;

  if p_use_wallet then
    update public.customers
    set balance_usd_cents = balance_usd_cents - v_total, updated_at = now()
    where id = v_customer;
    insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note)
    values (v_customer, -v_total, 'order_payment', v_order_id, 'Order #' || v_order_number);
    insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
    values (v_order_id, 'whish', 'USD', v_total, v_total);
  end if;

  if v_promo_id is not null then
    insert into public.promocode_redemptions (promocode_id, customer_id, order_id, redemption_year)
    values (v_promo_id, v_customer, v_order_id, extract(year from current_date)::integer);
  end if;

  update public.inventory_levels il
  set reserved = il.reserved + w.quantity, updated_at = now()
  from _web w
  where il.variant_id = w.variant_id and il.branch_id = v_branch;

  return query select v_order_id, v_order_number, v_discount;
end;
$$;
revoke all on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- ── Accessories categories (Boots / Scarves / Hats & Caps under SHAC) ────
insert into public.categories (code, name_en, name_ar, parent_id, sort, is_active)
select v.code, v.name_en, v.name_ar, (select id from public.categories where code = 'SHAC'), v.sort, true
from (values
  ('BOT', 'Boots', 'أحذية طويلة', 61),
  ('SCF', 'Scarves', 'شالات', 62),
  ('HAT', 'Hats & Caps', 'قبعات', 63)
) as v(code, name_en, name_ar, sort)
on conflict (code) do nothing;

update public.products set category_id = (select id from public.categories where code = 'BOT')
where name_en ~* 'boot' and category_id = (select id from public.categories where code = 'SHO');
update public.products set category_id = (select id from public.categories where code = 'SCF')
where name_en ~* 'scarf' and category_id = (select id from public.categories where code = 'ACC');
update public.products set category_id = (select id from public.categories where code = 'HAT')
where name_en ~* 'hat|cap|beanie' and category_id = (select id from public.categories where code = 'ACC');
