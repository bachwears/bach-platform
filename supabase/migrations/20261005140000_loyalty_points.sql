-- Loyalty points (founder decision 2026-10-05).
-- Earn: points per $1 of the pieces paid (delivery excluded), when a POS sale
-- completes or an online order is delivered — for any customer known by phone,
-- signed in or not (guest points wait on the customer record for their account).
-- Returns take back the points their credit earned. Rewards: every N points
-- convert into $X of wallet credit. Points expire after M months without a
-- purchase. All four numbers live in site_content 'loyalty' (edited in MGMT).

insert into public.site_content (key, value)
values ('loyalty', '{"enabled": true, "points_per_usd": 1, "reward_points": 100, "reward_usd_cents": 500, "expiry_months": 6}')
on conflict (key) do nothing;

alter table public.customers
  add column if not exists points_balance integer not null default 0 check (points_balance >= 0),
  add column if not exists points_activity_at timestamptz;

create table if not exists public.loyalty_points (
  id bigserial primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  delta integer not null check (delta <> 0),
  kind text not null check (kind in ('earn', 'reverse', 'redeem', 'expire', 'adjust')),
  order_id uuid references public.orders (id) on delete set null,
  return_id uuid,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists loyalty_points_customer_idx on public.loyalty_points (customer_id, created_at desc);
-- one earn per order, ever
create unique index if not exists loyalty_points_one_earn_per_order on public.loyalty_points (order_id) where kind = 'earn';

alter table public.loyalty_points enable row level security;
create policy "customer reads own points" on public.loyalty_points
  for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "staff read points" on public.loyalty_points
  for select to authenticated using (public.is_staff());
revoke all on public.loyalty_points from anon, authenticated;
grant select on public.loyalty_points to authenticated;
revoke all on sequence public.loyalty_points_id_seq from anon, authenticated;

-- wallet credit from points gets its own ledger kind
alter table public.wallet_transactions drop constraint wallet_transactions_kind_check;
alter table public.wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('whish_topup', 'return_credit', 'order_payment', 'order_refund', 'adjustment', 'loyalty_reward'));

-- Balances only move through the functions below (direct API writes keep the old value).
create or replace function public.guard_customer_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Direct API updates run as anon/authenticated; definer functions run as the owner.
  if current_user in ('anon', 'authenticated') then
    new.balance_usd_cents := old.balance_usd_cents;
    new.points_balance := old.points_balance;
    new.points_activity_at := old.points_activity_at;
    new.created_at := old.created_at;
    new.id := old.id;
  end if;
  -- Definer functions opt out explicitly; service role has auth.uid() null.
  if coalesce(current_setting('app.customer_guard_bypass', true), '') = 'on'
     or auth.uid() is null
     or public.is_staff() then
    return new;
  end if;
  if old.birthday is not null and new.birthday is distinct from old.birthday then
    raise exception 'birthday can only be corrected by customer care';
  end if;
  new.phone := old.phone;
  new.email := old.email;
  new.auth_user_id := old.auth_user_id;
  return new;
end;
$$;

-- Settings with safe defaults (and sane bounds) whatever is stored.
create or replace function public.loyalty_settings()
returns table (enabled boolean, points_per_usd integer, reward_points integer, reward_usd_cents integer, expiry_months integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((v->>'enabled')::boolean, true),
    least(greatest(coalesce((v->>'points_per_usd')::integer, 1), 0), 100),
    least(greatest(coalesce((v->>'reward_points')::integer, 100), 1), 100000),
    least(greatest(coalesce((v->>'reward_usd_cents')::integer, 500), 1), 100000),
    least(greatest(coalesce((v->>'expiry_months')::integer, 6), 1), 60)
  from (select coalesce((select value from public.site_content where key = 'loyalty'), '{}'::jsonb) as v) s;
$$;
grant execute on function public.loyalty_settings() to anon, authenticated;

-- Internal: move a customer's points and log it (negative moves never go below 0).
create or replace function public._loyalty_move(
  p_customer uuid, p_delta integer, p_kind text, p_order uuid default null, p_return uuid default null, p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_delta integer := p_delta;
begin
  select points_balance into v_balance from public.customers where id = p_customer for update;
  if v_balance is null then return 0; end if;
  if v_delta < 0 then v_delta := greatest(v_delta, -v_balance); end if;
  if v_delta = 0 then return 0; end if;
  update public.customers
  set points_balance = points_balance + v_delta,
      points_activity_at = case when p_kind = 'earn' then now() else points_activity_at end,
      updated_at = now()
  where id = p_customer;
  insert into public.loyalty_points (customer_id, delta, kind, order_id, return_id, note, created_by)
  values (p_customer, v_delta, p_kind, p_order, p_return, p_note, case when public.is_staff() then auth.uid() end);
  return v_delta;
end;
$$;
revoke all on function public._loyalty_move(uuid, integer, text, uuid, uuid, text) from public, anon, authenticated;

-- Earn when a POS sale completes or an online order is delivered.
create or replace function public.loyalty_earn_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_goods integer;
  v_points integer;
begin
  if new.customer_id is null or new.status not in ('completed', 'delivered') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('completed', 'delivered') then return new; end if;
  select * into s from public.loyalty_settings();
  if not s.enabled or s.points_per_usd = 0 then return new; end if;
  if exists (select 1 from public.loyalty_points where order_id = new.id and kind = 'earn') then return new; end if;
  v_goods := greatest(new.total_usd_cents - coalesce(new.delivery_usd_cents, 0), 0);
  v_points := (v_goods * s.points_per_usd) / 100;   -- whole points per whole dollar
  if v_points > 0 then
    perform public._loyalty_move(new.customer_id, v_points, 'earn', new.id, null, 'Order #' || new.number);
  end if;
  return new;
end;
$$;
drop trigger if exists orders_loyalty_earn on public.orders;
create trigger orders_loyalty_earn
  after insert or update of status on public.orders
  for each row execute function public.loyalty_earn_on_order();

-- A return takes back the points its credit earned (never more than that order earned).
create or replace function public.loyalty_reverse_on_return()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_number bigint;
  v_earned integer;
  v_reversed integer;
  v_rate integer;
  v_points integer;
begin
  select customer_id, number into v_customer, v_number from public.orders where id = new.order_id;
  if v_customer is null then return new; end if;
  select coalesce(sum(delta), 0) into v_earned from public.loyalty_points where order_id = new.order_id and kind = 'earn';
  if v_earned = 0 then return new; end if;
  select coalesce(-sum(delta), 0) into v_reversed from public.loyalty_points where order_id = new.order_id and kind = 'reverse';
  select points_per_usd into v_rate from public.loyalty_settings();
  v_points := least((coalesce(new.credit_usd_cents, 0) * v_rate) / 100, v_earned - v_reversed);
  if v_points > 0 then
    perform public._loyalty_move(v_customer, -v_points, 'reverse', new.order_id, new.id, 'Return on order #' || v_number);
  end if;
  return new;
end;
$$;
drop trigger if exists order_returns_loyalty_reverse on public.order_returns;
create trigger order_returns_loyalty_reverse
  after insert on public.order_returns
  for each row execute function public.loyalty_reverse_on_return();

-- Convert points into wallet credit: as many whole rewards as the balance allows.
-- The customer converts their own; cashiers and managers convert for a customer at the till.
create or replace function public.redeem_points(p_customer_id uuid default null)
returns table (points_used integer, credit_usd_cents integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_customer uuid;
  v_balance integer;
  v_rewards integer;
begin
  if p_customer_id is not null and public.current_app_role() in ('super_admin', 'store_manager', 'cashier') then
    v_customer := p_customer_id;
  else
    select id into v_customer from public.customers where auth_user_id = auth.uid();
  end if;
  if v_customer is null then raise exception 'customer not found'; end if;
  select * into s from public.loyalty_settings();
  if not s.enabled then raise exception 'loyalty is paused'; end if;
  select points_balance into v_balance from public.customers where id = v_customer for update;
  v_rewards := coalesce(v_balance, 0) / s.reward_points;
  if v_rewards < 1 then raise exception 'not enough points'; end if;
  points_used := v_rewards * s.reward_points;
  credit_usd_cents := v_rewards * s.reward_usd_cents;
  perform public._loyalty_move(v_customer, -points_used, 'redeem', null, null, points_used || ' points to wallet');
  update public.customers
  set balance_usd_cents = balance_usd_cents + credit_usd_cents, updated_at = now()
  where id = v_customer;
  insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, note, created_by)
  values (v_customer, credit_usd_cents, 'loyalty_reward', points_used || ' points',
          case when public.is_staff() then auth.uid() end);
  return next;
end;
$$;
revoke all on function public.redeem_points(uuid) from public, anon;
grant execute on function public.redeem_points(uuid) to authenticated;

-- Managers correct a balance by hand (reason required).
create or replace function public.adjust_points(p_customer_id uuid, p_delta integer, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager') then raise exception 'not allowed'; end if;
  if coalesce(p_delta, 0) = 0 then raise exception 'invalid amount'; end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then raise exception 'reason required'; end if;
  return public._loyalty_move(p_customer_id, p_delta, 'adjust', null, null, trim(p_note));
end;
$$;
revoke all on function public.adjust_points(uuid, integer, text) from public, anon;
grant execute on function public.adjust_points(uuid, integer, text) to authenticated;

-- Daily: points of customers with no purchase for the set number of months expire.
create or replace function public.expire_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  r record;
  n integer := 0;
begin
  select * into s from public.loyalty_settings();
  for r in
    select id from public.customers
    where points_balance > 0
      and coalesce(points_activity_at, created_at) < now() - make_interval(months => s.expiry_months)
  loop
    perform public._loyalty_move(r.id, -1000000000, 'expire', null, null, 'No purchase for ' || s.expiry_months || ' months');
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.expire_points() from public, anon, authenticated;

select cron.schedule('loyalty-expiry', '20 6 * * *', 'select public.expire_points()');
