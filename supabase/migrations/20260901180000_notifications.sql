-- Notifications (§10): template matrix + delivery log + event triggers.
-- Providers (Twilio WhatsApp / Resend email) are wired in the `notify`
-- edge function; until secrets exist, deliveries log as 'skipped'.

create type public.notification_channel as enum ('whatsapp', 'email');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  channel public.notification_channel not null,
  lang text not null check (lang in ('ar', 'en')),
  subject text,
  body text not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (event, channel, lang)
);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  channel public.notification_channel not null,
  recipient text not null,
  lang text not null default 'ar',
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_log_status_idx on public.notification_log (status, created_at) where status = 'queued';

alter table public.notification_templates enable row level security;
alter table public.notification_log enable row level security;

create policy "staff read templates" on public.notification_templates
  for select to authenticated using (public.is_staff());
create policy "marketing manages templates" on public.notification_templates
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'marketing_manager'));
create policy "staff read notification log" on public.notification_log
  for select to authenticated using (public.is_staff());
-- Writes to the log happen from triggers (definer context) and the edge function (service role).

-- The founder's number until staff notification preferences exist (§10).
insert into public.notification_templates (event, channel, lang, subject, body) values
  ('online_order_placed', 'whatsapp', 'ar', null,
   'طلب أونلاين جديد 🛍️ رقم {{order_number}} — {{customer_name}} ({{customer_phone}})، {{city}}. المجموع: {{total_usd}} / {{total_lbp}} ل.ل. فتّح لوحة POS لتأكيده.'),
  ('online_order_placed', 'email', 'en', 'Your BACH Wears order #{{order_number}}',
   'Thank you {{customer_name}} — we received your order #{{order_number}} ({{total_usd}}). We will call you on {{customer_phone}} to confirm delivery to {{city}}. Payment is cash on delivery. — BACH Wears'),
  ('order_shipped', 'whatsapp', 'ar', null,
   'طلبك من BACH رقم {{order_number}} صار بالطريق 🚚 المندوب رح يتواصل معك. المبلغ عند الاستلام: {{total_usd}}.'),
  ('order_shipped', 'email', 'en', 'Your BACH Wears order #{{order_number}} is on its way',
   'Good news {{customer_name}} — order #{{order_number}} has been dispatched. The courier will contact you. Amount due on delivery: {{total_usd}}. — BACH Wears'),
  ('order_delivered', 'whatsapp', 'ar', null,
   'وصل طلبك رقم {{order_number}} 🖤 شكراً إنك اخترت BACH Wears. إذا في أي شي، منيح تكون معنا: {{care_phone}}.'),
  ('order_cancelled', 'whatsapp', 'ar', null,
   'تم إلغاء طلبك رقم {{order_number}} من BACH Wears. إذا ما كان هيدا قصدك، حكينا: {{care_phone}}.');

-- Enqueue helper used by the triggers below.
create or replace function public._enqueue_notification(
  p_event text, p_channel public.notification_channel, p_recipient text, p_lang text, p_payload jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_recipient), '') = '' then return; end if;
  insert into public.notification_log (event, channel, recipient, lang, payload)
  values (p_event, p_channel, p_recipient, p_lang, p_payload);
end;
$$;

-- Online order placed → WhatsApp to the shop + email to the customer (if any).
create or replace function public.notify_online_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_payload jsonb;
begin
  if new.channel <> 'online' then return new; end if;
  select email into v_email from public.customers where id = new.customer_id;
  v_payload := jsonb_build_object(
    'order_number', new.number,
    'customer_name', coalesce(new.ship_name, ''),
    'customer_phone', coalesce(new.ship_phone, ''),
    'city', coalesce(new.ship_city, ''),
    'total_usd', '$' || to_char(new.total_usd_cents / 100.0, 'FM999990.00'),
    'total_lbp', to_char(round(new.total_usd_cents / 100.0 * new.lbp_per_usd), 'FM999,999,999,990'),
    'care_phone', '+961 71 566 296'
  );
  perform public._enqueue_notification('online_order_placed', 'whatsapp', 'shop', 'ar', v_payload);
  if v_email is not null then
    perform public._enqueue_notification('online_order_placed', 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$$;

create trigger orders_notify_placed
  after insert on public.orders
  for each row execute function public.notify_online_order();

-- Status changes on online orders → customer WhatsApp.
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text;
  v_payload jsonb;
begin
  if new.channel <> 'online' or new.status = old.status then return new; end if;
  v_event := case new.status
    when 'shipped' then 'order_shipped'
    when 'delivered' then 'order_delivered'
    when 'cancelled' then 'order_cancelled'
    else null end;
  if v_event is null then return new; end if;
  v_payload := jsonb_build_object(
    'order_number', new.number,
    'customer_name', coalesce(new.ship_name, ''),
    'total_usd', '$' || to_char(new.total_usd_cents / 100.0, 'FM999990.00'),
    'care_phone', '+961 71 566 296'
  );
  perform public._enqueue_notification(v_event, 'whatsapp', coalesce(new.ship_phone, ''), 'ar', v_payload);
  return new;
end;
$$;

create trigger orders_notify_status
  after update of status on public.orders
  for each row execute function public.notify_order_status();
