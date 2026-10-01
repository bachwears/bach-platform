-- Return requests: close themselves when the POS records the return, and tell
-- the customer about every decision.
--
-- Before: a request stayed "approved" until someone pressed "اكتمل" in MGMT —
-- and pressing it without the POS return closed it with no restock or refund.
-- Customers only ever heard "request received".

create or replace function public.close_return_requests_on_return()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.return_requests
  set status = 'completed', decided_at = coalesce(decided_at, now())
  where order_id = new.order_id and status in ('requested', 'approved');
  return new;
end;
$$;

drop trigger if exists order_returns_close_requests on public.order_returns;
create trigger order_returns_close_requests
  after insert on public.order_returns
  for each row execute function public.close_return_requests_on_return();

create or replace function public.notify_return_request_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event text;
  v_number bigint;
  v_email text;
  v_name text;
  v_payload jsonb;
begin
  if new.status = old.status then return new; end if;
  v_event := case new.status
    when 'approved' then 'return_approved'
    when 'rejected' then 'return_rejected'
    when 'completed' then 'return_completed'
    else null end;
  if v_event is null then return new; end if;
  select o.number, c.email, coalesce(o.ship_name, c.full_name, '')
  into v_number, v_email, v_name
  from public.orders o left join public.customers c on c.id = o.customer_id
  where o.id = new.order_id;
  v_payload := jsonb_build_object(
    'order_number', v_number,
    'customer_name', v_name,
    'kind', case when new.kind = 'exchange' then 'exchange' else 'return' end,
    'kind_ar', case when new.kind = 'exchange' then 'التبديل' else 'الإرجاع' end,
    'care_phone', '+961 71 566 296'
  );
  perform public._enqueue_notification(v_event, 'whatsapp', coalesce(new.phone, ''), 'ar', v_payload);
  if v_email is not null then
    perform public._enqueue_notification(v_event, 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$$;

drop trigger if exists return_requests_notify_status on public.return_requests;
create trigger return_requests_notify_status
  after update of status on public.return_requests
  for each row execute function public.notify_return_request_status();

insert into public.notification_templates (event, channel, lang, subject, body) values
  ('return_approved', 'email', 'en',
   'Your {{kind}} request for order #{{order_number}} is approved',
   'Good news {{customer_name}} — we''ve approved your {{kind}} request for order #{{order_number}}. Our team will contact you to arrange the next step. Questions? {{care_phone}}. — BACH Wears'),
  ('return_rejected', 'email', 'en',
   'About your {{kind}} request for order #{{order_number}}',
   'Hi {{customer_name}}, we couldn''t approve your {{kind}} request for order #{{order_number}}. Our team will contact you to explain — or reach us on {{care_phone}}. — BACH Wears'),
  ('return_completed', 'email', 'en',
   'Your {{kind}} for order #{{order_number}} is complete',
   'Your {{kind}} for order #{{order_number}} is complete. Thank you for shopping with BACH Wears. Questions? {{care_phone}}. — BACH Wears'),
  ('return_approved', 'whatsapp', 'ar', null,
   'وافقنا على طلب {{kind_ar}} لطلبك رقم {{order_number}}. فريقنا رح يتواصل معك ليرتّب الخطوة الجاية. لأي سؤال: {{care_phone}}.'),
  ('return_rejected', 'whatsapp', 'ar', null,
   'ما قدرنا نوافق على طلب {{kind_ar}} لطلبك رقم {{order_number}}. فريقنا رح يتواصل معك ليشرحلك، أو حاكينا على {{care_phone}}.'),
  ('return_completed', 'whatsapp', 'ar', null,
   'خلص {{kind_ar}} لطلبك رقم {{order_number}}. شكراً لأنك اخترت BACH Wears.')
on conflict (event, channel, lang) do nothing;
