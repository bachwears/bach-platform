-- Orders taken for a customer by the team (founder 2026-10-16).
-- Some customers order over Instagram or WhatsApp (often older customers who
-- find the site hard). Staff place the order for them from the POS, and it is
-- exactly a website order: same prices, promo codes, delivery fee, stock
-- reservation, cash on delivery / pay at pickup, notifications and fulfilment
-- queue. staff_customer_order runs storefront_checkout itself, so the two can
-- never drift apart; the order records where it came from and who took it.

alter table public.orders
  add column source text check (source in ('website', 'instagram', 'whatsapp', 'phone', 'other')),
  add column taken_by uuid references public.profiles (id);

comment on column public.orders.source is 'where an online order came from; null = the website';
comment on column public.orders.taken_by is 'the staff member who placed the order for the customer';

create or replace function public.staff_customer_order(
  p_items jsonb,
  p_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_source text,
  p_note text default null,
  p_email text default null,
  p_promocode text default null,
  p_fulfilment text default 'delivery'
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_staff uuid := auth.uid();
  v_claims text := current_setting('request.jwt.claims', true);
  v_sub text := current_setting('request.jwt.claim.sub', true);
  v_order record;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier', 'support_agent') then
    raise exception 'not allowed';
  end if;
  if p_source is null or p_source not in ('instagram', 'whatsapp', 'phone', 'other') then
    raise exception 'invalid source';
  end if;

  -- The order belongs to the customer, never to the staff member taking it:
  -- run the website checkout as a guest (auth.uid() is null inside), so it finds
  -- or creates the customer by phone exactly as it does for a guest order.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select * into v_order
  from public.storefront_checkout(
    p_items => p_items,
    p_name => p_name,
    p_phone => p_phone,
    p_city => p_city,
    p_address => p_address,
    p_note => p_note,
    p_email => p_email,
    p_promocode => p_promocode,
    p_payment_method => 'cod',
    p_use_wallet => false,
    p_fulfilment => p_fulfilment
  );
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);

  update public.orders
  set source = p_source, taken_by = v_staff
  where id = v_order.order_id;

  return query select v_order.order_id, v_order.order_number;
end $$;

revoke all on function public.staff_customer_order(jsonb, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.staff_customer_order(jsonb, text, text, text, text, text, text, text, text, text) to authenticated;
