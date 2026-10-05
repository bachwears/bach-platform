-- Notifications (§10), round 3:
--
-- 1. Admin / shop email. Shop-audience notifications (recipient 'shop') only
--    went to WhatsApp, which stays skipped until Twilio is live — so the shop
--    heard nothing about new orders, return requests or complaints. Every
--    'shop' row now also queues an internal English email to the address in
--    site_content 'notify' ->> 'admin_email' (editable in MGMT → محتوى الموقع).
--    Done with one trigger on notification_log, so every current and future
--    shop notification is covered without touching the RPCs that raise them:
--      online_order_placed → admin_online_order_placed  (link: /orders/{id})
--      return_requested    → admin_return_requested     (link: /returns)
--      complaint_received  → admin_complaint_received   (link: /complaints)
--    The 'notify' row holds a staff address, so it is hidden from the public
--    site_content read policy (staff still read it).
-- 2. Birthday: the day-before notice now also goes by email (it was WhatsApp
--    only); same consent rules as before (marketing_consent, birthday added
--    30+ days ago). Customers with an email but no phone now get the emails.
--    Dedupe is per recipient, so each channel is sent at most once.
-- 3. Online order status emails for confirmed / picking / packed (email only —
--    no WhatsApp templates for them), next to shipped / delivered / cancelled.
--    Status moves are forward-only (advance_online_order), and a status email
--    is never queued twice for the same order + recipient.

-- ── 1. site_content 'notify' ───────────────────────────────────────────────
insert into public.site_content (key, value)
values ('notify', jsonb_build_object('admin_email', 'bachmirwears@gmail.com'))
on conflict (key) do nothing;

drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content
  for select using (key <> 'notify' or public.is_staff());

/** The admin address from site_content 'notify', or null when unset / not an email. */
create or replace function public._admin_notify_email()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select e
  from (
    select lower(trim(value ->> 'admin_email')) as e
    from public.site_content where key = 'notify'
  ) s
  where e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(e) <= 254
$$;

revoke all on function public._admin_notify_email() from public, anon, authenticated;

-- Copies each shop WhatsApp row into an admin email row. Never lets a problem
-- here break the order / return / complaint that raised the notification.
create or replace function public.notification_log_admin_copy()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_to text;
  v_link text;
begin
  v_to := public._admin_notify_email();
  if v_to is null then return null; end if;
  begin
    v_link := case new.event
      when 'online_order_placed' then (
        select 'https://mgmt.bachwears.com/orders/' || o.id
        from public.orders o
        where o.number = (new.payload ->> 'order_number')::bigint
        limit 1)
      when 'return_requested' then 'https://mgmt.bachwears.com/returns'
      when 'complaint_received' then 'https://mgmt.bachwears.com/complaints'
      else null end;
    perform public._enqueue_notification(
      'admin_' || new.event, 'email', v_to, 'en',
      new.payload || jsonb_build_object(
        'mgmt_link', coalesce(v_link, 'https://mgmt.bachwears.com/'),
        'source_event', new.event));
  exception when others then
    raise warning 'admin notification copy failed for %: %', new.event, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.notification_log_admin_copy() from public, anon, authenticated;

drop trigger if exists notification_log_admin_copy on public.notification_log;
create trigger notification_log_admin_copy
  after insert on public.notification_log
  for each row
  when (new.recipient = 'shop' and new.channel = 'whatsapp' and new.event not like 'admin\_%')
  execute function public.notification_log_admin_copy();

-- Dedupe lookups (status + birthday) by event and recipient.
create index if not exists notification_log_event_recipient_idx
  on public.notification_log (event, recipient, created_at);

-- ── 2. Birthday: day-before email ──────────────────────────────────────────
create or replace function public.enqueue_birthday_notifications()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_promo record;
  v_c record;
  v_count integer := 0;
  v_payload jsonb;
  v_hit boolean;
begin
  select * into v_promo from public.promocodes where is_birthday and is_enabled limit 1;
  if v_promo is null then return 0; end if;

  for v_c in
    select id, full_name, phone, email, birthday from public.customers
    where marketing_consent and birthday is not null
      and (phone is not null or email is not null)
      and birthday_set_at <= now() - interval '30 days'
  loop
    v_payload := jsonb_build_object(
      'customer_name', coalesce(v_c.full_name, ''),
      'code', upper(v_promo.code),
      'percent', v_promo.value
    );

    if to_char(current_date + 1, 'MM-DD') = to_char(v_c.birthday, 'MM-DD') then
      v_hit := false;
      if v_c.phone is not null and not exists (
           select 1 from public.notification_log
           where event = 'birthday_upcoming' and recipient = v_c.phone
             and created_at > current_date - interval '2 days') then
        perform public._enqueue_notification('birthday_upcoming', 'whatsapp', v_c.phone, 'ar', v_payload);
        v_hit := true;
      end if;
      if v_c.email is not null and not exists (
           select 1 from public.notification_log
           where event = 'birthday_upcoming' and recipient = v_c.email
             and created_at > current_date - interval '2 days') then
        perform public._enqueue_notification('birthday_upcoming', 'email', v_c.email, 'en', v_payload);
        v_hit := true;
      end if;
      if v_hit then v_count := v_count + 1; end if;
    end if;

    if to_char(current_date, 'MM-DD') = to_char(v_c.birthday, 'MM-DD') then
      v_hit := false;
      if v_c.phone is not null and not exists (
           select 1 from public.notification_log
           where event = 'birthday_today' and recipient = v_c.phone
             and created_at > current_date - interval '1 day') then
        perform public._enqueue_notification('birthday_today', 'whatsapp', v_c.phone, 'ar', v_payload);
        v_hit := true;
      end if;
      if v_c.email is not null and not exists (
           select 1 from public.notification_log
           where event = 'birthday_today' and recipient = v_c.email
             and created_at > current_date - interval '1 day') then
        perform public._enqueue_notification('birthday_today', 'email', v_c.email, 'en', v_payload);
        v_hit := true;
      end if;
      if v_hit then v_count := v_count + 1; end if;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.enqueue_birthday_notifications() from public, anon, authenticated;

-- ── 3. Order status emails: confirmed / picking / packed ───────────────────
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event text;
  v_email text;
  v_payload jsonb;
  v_total text := '$' || to_char(new.total_usd_cents / 100.0, 'FM999990.00');
  v_email_only boolean;
begin
  if new.channel <> 'online' or new.status = old.status then return new; end if;
  v_event := case new.status
    when 'confirmed' then 'order_confirmed'
    when 'picking' then 'order_picking'
    when 'packed' then 'order_packed'
    when 'shipped' then 'order_shipped'
    when 'delivered' then 'order_delivered'
    when 'cancelled' then 'order_cancelled'
    else null end;
  if v_event is null then return new; end if;
  -- the in-progress steps are email only (no WhatsApp templates for them)
  v_email_only := new.status in ('confirmed', 'picking', 'packed');
  select email into v_email from public.customers where id = new.customer_id;
  v_payload := jsonb_build_object(
    'order_number', new.number,
    'customer_name', coalesce(new.ship_name, ''),
    'total_usd', v_total,
    'payment', coalesce(new.payment_method::text, 'cod'),
    'due_note', case when coalesce(new.payment_method::text, 'cod') = 'cod'
                     then 'Amount due on delivery: ' || v_total || '.'
                     else 'Already paid — nothing to pay on delivery.' end,
    'care_phone', '+961 71 566 296'
  );
  if not v_email_only then
    perform public._enqueue_notification(v_event, 'whatsapp', coalesce(new.ship_phone, ''), 'ar', v_payload);
  end if;
  if v_email is not null and not exists (
       select 1 from public.notification_log
       where event = v_event and channel = 'email' and recipient = v_email
         and payload ->> 'order_number' = new.number::text) then
    perform public._enqueue_notification(v_event, 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$$;

-- ── Templates (plain text; the branded HTML comes from the notify function) ─
insert into public.notification_templates (event, channel, lang, subject, body) values
  ('order_confirmed', 'email', 'en',
   'Your BACH Wears order #{{order_number}} is confirmed',
   'Your order #{{order_number}} is confirmed. We are preparing it now and will email you again when it is on its way. — BACH Wears'),
  ('order_picking', 'email', 'en',
   'We are preparing your order #{{order_number}}',
   'Our team is selecting and checking each piece of order #{{order_number}}. — BACH Wears'),
  ('order_packed', 'email', 'en',
   'Your BACH Wears order #{{order_number}} is packed',
   'Order #{{order_number}} is packed and ready for the courier. We will email you when it is on its way. — BACH Wears'),
  ('birthday_upcoming', 'email', 'en',
   'Tomorrow is your day — a gift from BACH Wears',
   'Happy almost-birthday, {{customer_name}}. Your gift is ready: {{percent}}% off everything with code {{code}} — valid for a few days around your day. — BACH Wears'),
  ('admin_online_order_placed', 'email', 'en',
   'New online order #{{order_number}} — {{total_usd}}',
   'New online order #{{order_number}} from {{customer_name}} ({{customer_phone}}), {{city}}. Total {{total_usd}} / {{total_lbp}} LBP. Confirm it in MGMT: {{mgmt_link}}'),
  ('admin_return_requested', 'email', 'en',
   'New {{kind}} request — order #{{order_number}}',
   '{{customer_name}} asked for a {{kind}} on order #{{order_number}}. Items: {{items_summary}}. Reason: {{reason}}. Review it in MGMT: {{mgmt_link}}'),
  ('admin_complaint_received', 'email', 'en',
   'New complaint — ticket #{{ticket}}',
   'Ticket #{{ticket}} from {{customer_name}} ({{customer_phone}}): {{subject}}. Open the complaints queue: {{mgmt_link}}')
on conflict (event, channel, lang) do nothing;
