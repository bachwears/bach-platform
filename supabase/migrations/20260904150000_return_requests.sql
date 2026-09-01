-- Online return/exchange requests (§6 self-service).
-- Customers (or guests) file a request against a delivered online order;
-- staff review it in MGMT, and the physical return still settles at POS.

create type public.return_request_status as enum
  ('requested', 'approved', 'rejected', 'completed', 'cancelled');

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  kind text not null check (kind in ('return', 'exchange')),
  status public.return_request_status not null default 'requested',
  -- [{order_item_id, quantity}] — validated against the order at submit time.
  items jsonb not null,
  reason text not null,
  phone text not null,
  exchange_note text,
  staff_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index return_requests_order_idx on public.return_requests (order_id);
create index return_requests_status_idx on public.return_requests (status, created_at desc);

alter table public.return_requests enable row level security;

create policy "return_requests_staff_all" on public.return_requests
  for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger return_requests_touch
  before update on public.return_requests
  for each row execute function public.touch_updated_at();

-- Digits-tail phone match: tolerates +961 / 00961 / leading-0 variants.
create or replace function public._phone_matches(p_a text, p_b text)
returns boolean language sql immutable as $$
  select right(regexp_replace(coalesce(p_a, ''), '[^0-9]', '', 'g'), 8)
       = right(regexp_replace(coalesce(p_b, ''), '[^0-9]', '', 'g'), 8)
     and length(regexp_replace(coalesce(p_a, ''), '[^0-9]', '', 'g')) >= 7;
$$;

-- Step 1: look up an order for the returns form. Phone-gated, guest-friendly.
create or replace function public.lookup_order_for_return(p_number bigint, p_phone text)
returns table (
  order_number bigint,
  order_status text,
  ordered_at timestamptz,
  eligible boolean,
  ineligible_reason text,
  items jsonb,
  requests jsonb
) language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_reason text;
begin
  select o.* into v_order
  from public.orders o
  where o.number = p_number and public._phone_matches(o.ship_phone, p_phone);
  if v_order.id is null then
    return; -- empty result: not found / phone mismatch (indistinguishable on purpose)
  end if;

  v_reason := case
    when v_order.channel <> 'online' then 'pos_order'
    when v_order.status not in ('delivered', 'completed') then 'not_delivered'
    when v_order.created_at < now() - interval '30 days' then 'window_passed'
    when exists (
      select 1 from public.return_requests r
      where r.order_id = v_order.id and r.status in ('requested', 'approved')
    ) then 'open_request'
    else null
  end;

  return query
  select
    v_order.number,
    v_order.status::text,
    v_order.created_at,
    v_reason is null,
    v_reason,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_item_id', oi.id,
        'name_en', oi.name_en,
        'size', oi.size,
        'color_en', oi.color_en,
        'quantity', oi.quantity
      ) order by oi.name_en)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', r.kind,
        'status', r.status,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from public.return_requests r where r.order_id = v_order.id
    ), '[]'::jsonb);
end;
$$;

-- Step 2: file the request.
create or replace function public.submit_return_request(
  p_number bigint,
  p_phone text,
  p_kind text,
  p_reason text,
  p_items jsonb,
  p_exchange_note text default null
) returns table (request_id uuid) language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_ordered integer;
  v_id uuid;
  v_summary text := '';
  v_email text;
begin
  if p_kind not in ('return', 'exchange') then
    raise exception 'invalid kind';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'no items selected';
  end if;

  select o.* into v_order
  from public.orders o
  where o.number = p_number and public._phone_matches(o.ship_phone, p_phone);
  if v_order.id is null then
    raise exception 'order not found';
  end if;
  if v_order.channel <> 'online' then
    raise exception 'pos orders are handled in store';
  end if;
  if v_order.status not in ('delivered', 'completed') then
    raise exception 'order not delivered yet';
  end if;
  if v_order.created_at < now() - interval '30 days' then
    raise exception 'return window passed';
  end if;
  if exists (
    select 1 from public.return_requests r
    where r.order_id = v_order.id and r.status in ('requested', 'approved')
  ) then
    raise exception 'open request exists';
  end if;

  -- Validate each item belongs to the order and quantity is sane.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select oi.quantity into v_ordered
    from public.order_items oi
    where oi.id = (v_item->>'order_item_id')::uuid and oi.order_id = v_order.id;
    if v_ordered is null then
      raise exception 'item not on this order';
    end if;
    if coalesce((v_item->>'quantity')::integer, 0) < 1
       or (v_item->>'quantity')::integer > v_ordered then
      raise exception 'invalid quantity';
    end if;
    select coalesce(v_summary || oi.name_en || ' ' || oi.size || ' ×' || (v_item->>'quantity') || '، ', v_summary)
      into v_summary
    from public.order_items oi where oi.id = (v_item->>'order_item_id')::uuid;
  end loop;

  insert into public.return_requests (order_id, kind, items, reason, phone, exchange_note)
  values (
    v_order.id,
    p_kind,
    (select jsonb_agg(jsonb_build_object(
       'order_item_id', e->>'order_item_id',
       'quantity', (e->>'quantity')::integer))
     from jsonb_array_elements(p_items) e),
    trim(p_reason),
    p_phone,
    nullif(trim(coalesce(p_exchange_note, '')), '')
  )
  returning id into v_id;

  -- Tell the shop; confirm to the customer by email when we know one.
  perform public._enqueue_notification(
    'return_requested', 'whatsapp', 'shop', 'ar',
    jsonb_build_object(
      'order_number', v_order.number,
      'kind', p_kind,
      'items_summary', rtrim(v_summary, '، '),
      'reason', trim(p_reason),
      'customer_name', coalesce(v_order.ship_name, '')
    )
  );
  select c.email into v_email
  from public.customers c where c.id = v_order.customer_id and c.email is not null;
  if v_email is not null then
    perform public._enqueue_notification(
      'return_requested', 'email', v_email, 'en',
      jsonb_build_object(
        'order_number', v_order.number,
        'kind', p_kind,
        'customer_name', coalesce(v_order.ship_name, ''),
        'care_phone', '+961 71 566 296'
      )
    );
  end if;

  return query select v_id;
end;
$$;

grant execute on function public.lookup_order_for_return(bigint, text) to anon, authenticated;
grant execute on function public.submit_return_request(bigint, text, text, text, jsonb, text) to anon, authenticated;

insert into public.notification_templates (event, channel, lang, subject, body) values
  ('return_requested', 'whatsapp', 'ar', null,
   'طلب {{kind}} جديد عالطلب رقم {{order_number}} من {{customer_name}}. القطع: {{items_summary}}. السبب: {{reason}}. راجعوه من لوحة الإدارة.'),
  ('return_requested', 'email', 'en', 'We received your return request — order #{{order_number}}',
   'Hi {{customer_name}}, we received your {{kind}} request for order #{{order_number}}. Our team will review it and contact you within one business day. Questions? {{care_phone}}. — BACH Wears')
on conflict (event, channel, lang) do nothing;
