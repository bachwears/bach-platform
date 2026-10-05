-- Customer account: two-step sign-in, privacy tools, Fit Finder (2026-10-05).
--
-- 1. Two-step sign-in by email (opt-in). The flag lives on the customer row
--    (owner reads and switches it through the normal "updates own profile"
--    policy). two_step_required() lets the sign-in page ask for it by email;
--    it only ever answers true/false, and false for unknown emails.
-- 2. Privacy: export_my_data() returns everything we hold on the signed-in
--    customer as one JSON document; delete_my_account() anonymises the
--    customer row (orders stay for accounting, linked to "Deleted customer"),
--    clears wishlist / newsletter / stock alerts and removes the login.
-- 3. Fit Finder answers, saved for signed-in customers to prefill next time.

alter table public.customers
  add column if not exists two_step_email boolean not null default false,
  add column if not exists height_cm smallint check (height_cm between 120 and 230),
  add column if not exists weight_kg smallint check (weight_kg between 35 and 250),
  add column if not exists fit_pref text check (fit_pref in ('closer', 'regular', 'relaxed'));

-- ── two-step lookup ───────────────────────────────────────────────────────
-- Anon-callable on purpose (the flag is needed around sign-in). Throttled per
-- email and per caller address so it can't be used to sweep a list of emails.
create or replace function public.two_step_required(p_email text)
 returns boolean
 language plpgsql
 volatile security definer
 set search_path to 'public'
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ip text := split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::json)->>'x-forwarded-for', ''), ',', 1);
begin
  if v_email = '' then return false; end if;
  perform public._rate_limit('two_step:email', v_email, 20, interval '1 hour');
  perform public._rate_limit('two_step:ip', trim(v_ip), 60, interval '1 hour');
  return coalesce((
    select c.two_step_email
    from auth.users u
    join public.customers c on c.auth_user_id = u.id
    where lower(u.email) = v_email
    limit 1
  ), false);
end;
$function$;
revoke all on function public.two_step_required(text) from public;
grant execute on function public.two_step_required(text) to anon, authenticated;

-- ── download my data ──────────────────────────────────────────────────────
-- Staff-only fields (cashier, branch, internal notes, assignees) are left out.
create or replace function public.export_my_data()
 returns jsonb
 language plpgsql
 volatile security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_user record;
  v_c public.customers;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  perform public._rate_limit('export_my_data', v_uid::text, 10, interval '1 hour');
  select id, email, phone, created_at, last_sign_in_at into v_user from auth.users where id = v_uid;
  select * into v_c from public.customers where auth_user_id = v_uid;

  return jsonb_build_object(
    'exported_at', now(),
    'brand', 'BACH Wears — bachwears.com',
    'account', jsonb_build_object(
      'email', v_user.email,
      'phone', v_user.phone,
      'created_at', v_user.created_at,
      'last_sign_in_at', v_user.last_sign_in_at
    ),
    'profile', case when v_c.id is null then null else to_jsonb(v_c) - 'auth_user_id' end,
    'orders', coalesce((
      select jsonb_agg(
        (to_jsonb(o) - 'cashier_id' - 'branch_id' - 'client_ref' - 'customer_id')
        || jsonb_build_object('items', coalesce((
          select jsonb_agg(to_jsonb(i) - 'order_id' - 'variant_id' order by i.name_en)
          from public.order_items i where i.order_id = o.id
        ), '[]'::jsonb))
        order by o.created_at)
      from public.orders o where o.customer_id = v_c.id
    ), '[]'::jsonb),
    'return_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_number', o.number, 'kind', r.kind, 'status', r.status, 'items', r.items,
        'reason', r.reason, 'phone', r.phone, 'exchange_note', r.exchange_note,
        'decided_at', r.decided_at, 'created_at', r.created_at) order by r.created_at)
      from public.return_requests r join public.orders o on o.id = r.order_id
      where o.customer_id = v_c.id
    ), '[]'::jsonb),
    'wallet_transactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'delta_usd_cents', w.delta_usd_cents, 'kind', w.kind, 'note', w.note, 'created_at', w.created_at)
        order by w.created_at)
      from public.wallet_transactions w where w.customer_id = v_c.id
    ), '[]'::jsonb),
    'wallet_topups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount_usd_cents', t.amount_usd_cents, 'receipt_no', t.receipt_no, 'status', t.status,
        'decided_at', t.decided_at, 'created_at', t.created_at) order by t.created_at)
      from public.wallet_topups t where t.customer_id = v_c.id
    ), '[]'::jsonb),
    'loyalty_points', coalesce((
      select jsonb_agg(jsonb_build_object(
        'delta', l.delta, 'kind', l.kind, 'note', l.note, 'created_at', l.created_at) order by l.created_at)
      from public.loyalty_points l where l.customer_id = v_c.id
    ), '[]'::jsonb),
    'promocodes_used', coalesce((
      select jsonb_agg(jsonb_build_object('code', p.code, 'year', pr.redemption_year, 'created_at', pr.created_at)
        order by pr.created_at)
      from public.promocode_redemptions pr join public.promocodes p on p.id = pr.promocode_id
      where pr.customer_id = v_c.id
    ), '[]'::jsonb),
    'wishlist', coalesce((
      select jsonb_agg(jsonb_build_object('product', p.name_en, 'slug', p.slug, 'saved_at', w.created_at)
        order by w.created_at)
      from public.wishlists w join public.products p on p.id = w.product_id
      where w.customer_id = v_c.id
    ), '[]'::jsonb),
    'stock_alerts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product', p.name_en, 'size', v.size, 'colour', v.color_en,
        'notified_at', a.notified_at, 'created_at', a.created_at) order by a.created_at)
      from public.stock_alerts a
      join public.product_variants v on v.id = a.variant_id
      join public.products p on p.id = v.product_id
      where a.customer_id = v_c.id or lower(a.email) = lower(v_user.email)
    ), '[]'::jsonb),
    'complaints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', k.number, 'name', k.name, 'phone', k.phone, 'email', k.email,
        'order_number', k.order_number, 'subject', k.subject, 'body', k.body,
        'status', k.status, 'created_at', k.created_at) order by k.created_at)
      from public.complaints k
      where k.customer_id = v_c.id or lower(k.email) = lower(v_user.email)
    ), '[]'::jsonb),
    'newsletter', coalesce((
      select jsonb_agg(jsonb_build_object(
        'email', n.email, 'subscribed', n.unsubscribed_at is null, 'source', n.source,
        'consented_at', n.consented_at, 'unsubscribed_at', n.unsubscribed_at))
      from public.newsletter_subscribers n where lower(n.email) = lower(v_user.email)
    ), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ── delete my account ─────────────────────────────────────────────────────
-- Refuses while money or an order is still in flight; otherwise anonymises the
-- customer row in place (orders, returns and the wallet ledger keep pointing at
-- it for the books) and deletes the login itself.
create or replace function public.delete_my_account()
 returns void
 language plpgsql
 volatile security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_c public.customers;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_c from public.customers where auth_user_id = v_uid for update;

  if v_c.id is not null then
    if v_c.balance_usd_cents > 0 then
      raise exception 'wallet balance not empty';
    end if;
    if exists (select 1 from public.wallet_topups where customer_id = v_c.id and status = 'pending') then
      raise exception 'wallet top-up pending';
    end if;
    if exists (
      select 1 from public.orders
      where customer_id = v_c.id and channel = 'online'
        and status in ('pending', 'confirmed', 'picking', 'packed', 'shipped')
    ) then
      raise exception 'order still open';
    end if;

    -- phone is nullable-unique, so null (not a placeholder) is the clean erase;
    -- the guard trigger would otherwise keep phone/email/birthday as they were
    perform set_config('app.customer_guard_bypass', 'on', true);
    update public.customers set
      full_name = 'Deleted customer',
      email = null,
      phone = null,
      birthday = null,
      size_top = null,
      size_bottom = null,
      size_shoe = null,
      height_cm = null,
      weight_kg = null,
      fit_pref = null,
      two_step_email = false,
      marketing_consent = false,
      auth_user_id = null,
      updated_at = now()
    where id = v_c.id;
    perform set_config('app.customer_guard_bypass', '', true);

    delete from public.wishlists where customer_id = v_c.id;
    delete from public.stock_alerts where customer_id = v_c.id;
  end if;

  if v_email is not null then
    delete from public.stock_alerts where lower(email) = lower(v_email);
    delete from public.newsletter_subscribers where lower(email) = lower(v_email);
  end if;
  delete from auth.users where id = v_uid;
end;
$function$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ── Two-step, enforced by Supabase Auth itself ──────────────────────────────
-- Custom Access Token hook: a PASSWORD sign-in for a customer with two-step on is
-- refused with 'two_step_required' (the password was already verified when the
-- hook runs). The sign-in page then sends the email code; signing in with the
-- code (otp) passes. Takes effect once the owner enables the hook:
-- Dashboard → Authentication → Hooks → Custom Access Token → public.custom_access_token_hook.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if event->>'authentication_method' = 'password'
     and exists (
       select 1 from public.customers
       where auth_user_id = (event->>'user_id')::uuid and two_step_email
     ) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'two_step_required'));
  end if;
  return event;
end;
$$;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
