-- Order status emails. Shipped / delivered / cancelled only queued WhatsApp,
-- so with WhatsApp not yet live customers heard nothing after the order
-- confirmation. Status changes now also email the customer when we have an
-- address, and payloads carry the payment method so "due on delivery" is only
-- said for cash-on-delivery orders.

create or replace function public.notify_online_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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
    'payment', coalesce(new.payment_method::text, 'cod'),
    'care_phone', '+961 71 566 296'
  );
  perform public._enqueue_notification('online_order_placed', 'whatsapp', 'shop', 'ar', v_payload);
  if v_email is not null then
    perform public._enqueue_notification('online_order_placed', 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$$;

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
begin
  if new.channel <> 'online' or new.status = old.status then return new; end if;
  v_event := case new.status
    when 'shipped' then 'order_shipped'
    when 'delivered' then 'order_delivered'
    when 'cancelled' then 'order_cancelled'
    else null end;
  if v_event is null then return new; end if;
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
  perform public._enqueue_notification(v_event, 'whatsapp', coalesce(new.ship_phone, ''), 'ar', v_payload);
  if v_email is not null then
    perform public._enqueue_notification(v_event, 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$$;

-- Plain-text bodies (the HTML layout comes from the notify function).
insert into public.notification_templates (event, channel, lang, subject, body) values
  ('order_delivered', 'email', 'en',
   'Your BACH Wears order #{{order_number}} has arrived',
   'Your order #{{order_number}} has been delivered. Thank you for choosing BACH Wears — if anything isn''t right, contact us on {{care_phone}}. — BACH Wears'),
  ('order_cancelled', 'email', 'en',
   'Your BACH Wears order #{{order_number}} was cancelled',
   'Order #{{order_number}} has been cancelled. If you didn''t ask for this, contact us on {{care_phone}}. — BACH Wears')
on conflict (event, channel, lang) do nothing;

-- The shipped email only says "due on delivery" for cash-on-delivery orders.
update public.notification_templates
set body = 'Good news {{customer_name}} — order #{{order_number}} has been dispatched. The courier will contact you. {{due_note}} — BACH Wears',
    updated_at = now()
where event = 'order_shipped' and channel = 'email' and lang = 'en'
  and body = 'Good news {{customer_name}} — order #{{order_number}} has been dispatched. The courier will contact you. Amount due on delivery: {{total_usd}}. — BACH Wears';

-- Guest order tracking (/track): order number + the phone used at checkout.
-- The phone is compared on its last 8 digits so "+961 71 …", "71 …" and
-- "0071…" all match; both are required, so a number alone reveals nothing.
create or replace function public.track_order(p_number bigint, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'number', o.number,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'total_usd_cents', o.total_usd_cents,
    'payment', o.payment_method,
    'city', o.ship_city,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name_en, 'size', i.size, 'color', i.color_en, 'qty', i.quantity) order by i.name_en)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  where o.number = p_number
    and o.channel = 'online'
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and right(regexp_replace(coalesce(o.ship_phone, c.phone, ''), '\D', '', 'g'), 8)
        = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8)
$$;

revoke all on function public.track_order(bigint, text) from public;
grant execute on function public.track_order(bigint, text) to anon, authenticated;
