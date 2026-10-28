-- Checkout step analytics: where shoppers stop between opening checkout and
-- placing the order (MGMT → التحليلات → خطوات الدفع). One new event,
-- checkout_step; the step rides in source ('touch', 'name', 'phone', 'email',
-- 'city', 'address', 'pickup', 'ready', 'submit', 'blocked', 'refused') and
-- meta holds only field names or the refusal reason, never what was typed.

alter table public.site_events drop constraint site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event = any (array[
  'page_view', 'product_view', 'add_to_bag', 'rec_click', 'bag_view',
  'checkout_start', 'order_placed', 'delivery_bar_seen', 'search',
  'outfit_view', 'outfit_add', 'checkout_step'
]));

CREATE OR REPLACE FUNCTION public.track_event(p_event text, p_visitor_hash text, p_path text DEFAULT NULL::text, p_product text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_value_cents integer DEFAULT NULL::integer, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_product uuid;
  v_hits integer;
begin
  if p_event is null or p_event not in (
    'page_view', 'product_view', 'add_to_bag', 'rec_click', 'bag_view',
    'checkout_start', 'order_placed', 'delivery_bar_seen', 'search',
    'outfit_view', 'outfit_add', 'checkout_step'
  ) then return false; end if;
  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{16,64}$' then return false; end if;
  if p_path is not null and (char_length(p_path) > 200 or left(p_path, 1) <> '/') then return false; end if;
  if p_source is not null and p_source !~ '^[a-z_]{1,32}$' then return false; end if;
  if p_value_cents is not null and (p_value_cents < 0 or p_value_cents > 100000000) then return false; end if;
  if p_meta is not null and (jsonb_typeof(p_meta) <> 'object' or octet_length(p_meta::text) > 1024) then return false; end if;

  -- fixed hourly window, in the shared rate-limit counter table
  insert into public.rate_limit_hits as r (bucket, key_hash, window_start, hits)
  values ('site_events', md5(p_visitor_hash), date_trunc('hour', now()), 1)
  on conflict (bucket, key_hash, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  if v_hits > 300 then return false; end if;

  -- the client sends a product id or a slug; unknown ones are kept as "no product"
  if p_product ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_product from public.products where id = p_product::uuid;
  elsif p_product ~ '^[a-z0-9-]{1,160}$' then
    select id into v_product from public.products where slug = p_product;
  end if;

  insert into public.site_events (event, path, product_id, source, value_cents, visitor_hash, meta)
  values (p_event, p_path, v_product, p_source, p_value_cents, p_visitor_hash, p_meta);
  return true;
end;
$function$;

-- MGMT → التحليلات gains: checkout steps (where checkout visits stop), the
-- first missing detail on a blocked "Place order" tap, refusal reasons, and
-- "seen a lot, rarely sold" pieces.
CREATE OR REPLACE FUNCTION public.site_analytics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 400);
  v_from timestamptz;
  v_free integer;
  v_out jsonb;
begin
  if coalesce(public.current_app_role()::text, '') not in ('super_admin', 'store_manager', 'marketing_manager') then
    raise exception 'not allowed';
  end if;
  v_from := (date_trunc('day', now() at time zone 'utc') - make_interval(days => v_days - 1)) at time zone 'utc';
  select coalesce((value ->> 'free_over_usd_cents')::integer, 10000) into v_free
    from public.site_content where key = 'delivery';
  v_free := coalesce(v_free, 10000);

  with e as (
    select ev.*, (ev.created_at at time zone 'utc')::date as day
    from public.site_events ev
    where ev.created_at >= v_from
  ),
  vd as (
    -- one row per visitor-day, with the furthest funnel step reached
    select day, visitor_hash,
      bool_or(event = 'product_view') as viewed,
      bool_or(event = 'add_to_bag') as added,
      bool_or(event = 'checkout_start') as checkout,
      bool_or(event = 'order_placed') as ordered
    from e group by day, visitor_hash
  )
  select jsonb_build_object(
    'days', v_days,
    'from', v_from,
    'free_over_cents', v_free,
    'totals', (
      select jsonb_build_object(
        'visitors', (select count(*) from vd),
        'page_views', count(*) filter (where event = 'page_view'),
        'product_views', count(*) filter (where event = 'product_view'),
        'adds', count(*) filter (where event = 'add_to_bag'),
        'bag_views', count(*) filter (where event = 'bag_view'),
        'checkouts', count(*) filter (where event = 'checkout_start'),
        'orders', count(*) filter (where event = 'order_placed'),
        'searches', count(*) filter (where event = 'search'),
        'revenue_cents', coalesce(sum(value_cents) filter (where event = 'order_placed'), 0),
        'aov_cents', coalesce(round(avg(value_cents) filter (where event = 'order_placed')), 0),
        'orders_free_delivery', count(*) filter (where event = 'order_placed' and (meta ->> 'goods') ~ '^\d{1,9}$' and (meta ->> 'goods')::integer >= v_free),
        'orders_with_goods', count(*) filter (where event = 'order_placed' and (meta ->> 'goods') ~ '^\d{1,9}$')
      ) from e
    ),
    'funnel', (
      select jsonb_build_object(
        'visitors', count(*),
        'viewed', count(*) filter (where viewed),
        'added', count(*) filter (where added),
        'checkout', count(*) filter (where checkout),
        'ordered', count(*) filter (where ordered)
      ) from vd
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day, 'visitors', d.visitors, 'product_views', d.views, 'adds', d.adds, 'orders', d.orders
      ) order by d.day)
      from (
        select day,
          count(distinct visitor_hash) as visitors,
          count(*) filter (where event = 'product_view') as views,
          count(*) filter (where event = 'add_to_bag') as adds,
          count(*) filter (where event = 'order_placed') as orders
        from e group by day
      ) d
    ), '[]'::jsonb),
    'top_viewed', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name_en, 'slug', p.slug, 'views', t.views, 'adds', t.adds) order by t.views desc, t.adds desc)
      from (
        select product_id,
          count(*) filter (where event = 'product_view') as views,
          count(*) filter (where event = 'add_to_bag') as adds
        from e where product_id is not null and event in ('product_view', 'add_to_bag')
        group by product_id
        order by views desc, adds desc
        limit 15
      ) t join public.products p on p.id = t.product_id
    ), '[]'::jsonb),
    'top_added', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name_en, 'slug', p.slug, 'views', t.views, 'adds', t.adds) order by t.adds desc, t.views desc)
      from (
        select product_id,
          count(*) filter (where event = 'product_view') as views,
          count(*) filter (where event = 'add_to_bag') as adds
        from e where product_id is not null and event in ('product_view', 'add_to_bag')
        group by product_id
        having count(*) filter (where event = 'add_to_bag') > 0
        order by adds desc, views desc
        limit 15
      ) t join public.products p on p.id = t.product_id
    ), '[]'::jsonb),
    -- per placement: clicks on its cards, quick adds straight from them, and PDP
    -- adds made after arriving through one of its cards (meta.via)
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', s.source, 'clicks', s.clicks, 'quick_adds', s.quick_adds, 'pdp_adds', s.pdp_adds) order by s.clicks + s.quick_adds + s.pdp_adds desc)
      from (
        select src as source,
          count(*) filter (where event = 'rec_click') as clicks,
          count(*) filter (where event = 'add_to_bag' and source = src) as quick_adds,
          count(*) filter (where event = 'add_to_bag' and source = 'pdp' and meta ->> 'via' = src) as pdp_adds
        from (
          select e.*, case when event = 'add_to_bag' and source = 'pdp' then meta ->> 'via' else source end as src
          from e where event in ('rec_click', 'add_to_bag')
        ) x
        where src is not null and src ~ '^[a-z_]{1,32}$'
        group by src
      ) s
    ), '[]'::jsonb),
    -- free-delivery bar, by where it was shown (bag, product page, checkout)
    'delivery_bar', coalesce((
      select jsonb_agg(jsonb_build_object('place', b.place, 'seen', b.seen, 'below', b.below, 'avg_gap_cents', b.avg_gap) order by b.seen desc)
      from (
        select case
            when path like '/cart%' then 'bag'
            when path like '/products/%' then 'pdp'
            when path like '/checkout%' then 'checkout'
            else 'other' end as place,
          count(*) as seen,
          count(*) filter (where value_cents > 0) as below,
          coalesce(round(avg(value_cents) filter (where value_cents > 0)), 0) as avg_gap
        from e where event = 'delivery_bar_seen'
        group by 1
      ) b
    ), '[]'::jsonb),
    -- where checkout visits stop: per visitor-day that opened checkout, the
    -- furthest steps reached (checkout_step events, see storefront checkout page)
    'checkout_steps', (
      select jsonb_build_object(
        'started', count(*),
        'touch', count(*) filter (where 'touch' = any(c.steps)),
        'name', count(*) filter (where 'name' = any(c.steps)),
        'phone', count(*) filter (where 'phone' = any(c.steps)),
        'email', count(*) filter (where 'email' = any(c.steps)),
        'city', count(*) filter (where 'city' = any(c.steps)),
        'address', count(*) filter (where 'address' = any(c.steps)),
        'pickup', count(*) filter (where 'pickup' = any(c.steps)),
        'ready', count(*) filter (where 'ready' = any(c.steps)),
        'submit', count(*) filter (where 'submit' = any(c.steps)),
        'blocked', count(*) filter (where 'blocked' = any(c.steps)),
        'refused', count(*) filter (where 'refused' = any(c.steps)),
        -- step tracking goes live with this release (28 Oct); counting from the
        -- next full UTC day keeps half-tracked visits out. The steps above only
        -- exist for tracked visits; ordered is counted on the same base.
        'tracked', count(*) filter (where c.tracked),
        'ordered', count(*) filter (where c.ordered and c.tracked)
      )
      from (
        select day, visitor_hash,
          array_agg(distinct source) filter (where event = 'checkout_step') as steps,
          bool_or(event = 'order_placed') as ordered,
          bool_or(event = 'checkout_start' and created_at >= '2026-10-29 00:00+00') as tracked
        from e where event in ('checkout_start', 'checkout_step', 'order_placed')
        group by day, visitor_hash
        having bool_or(event = 'checkout_start')
      ) c
    ),
    -- a tap on "Place order" with a detail missing: the first missing one
    'checkout_blocked', coalesce((
      select jsonb_agg(jsonb_build_object('field', b.field, 'n', b.n) order by b.n desc)
      from (
        select split_part(meta ->> 'missing', ',', 1) as field, count(*) as n
        from e where event = 'checkout_step' and source = 'blocked' and meta ? 'missing'
        group by 1
      ) b
    ), '[]'::jsonb),
    'checkout_refused', coalesce((
      select jsonb_agg(jsonb_build_object('reason', r.reason, 'n', r.n) order by r.n desc)
      from (
        select left(meta ->> 'reason', 60) as reason, count(*) as n
        from e where event = 'checkout_step' and source = 'refused'
        group by 1 order by 2 desc limit 10
      ) r
    ), '[]'::jsonb),
    -- seen a lot, rarely added or sold: pieces with 20+ views, lowest add rate
    -- first, with the pieces sold (every channel, cancelled/returned left out)
    'unsold', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', p.name_en, 'slug', p.slug, 'views', t.views, 'adds', t.adds,
        'sold', coalesce(s.sold, 0), 'stock', coalesce(st.stock, 0),
        'variants_left', coalesce(st.variants_left, 0), 'variants', coalesce(st.variants, 0),
        'price_cents', least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents)
      ) order by t.adds::numeric / t.views, t.views desc)
      from (
        select product_id,
          count(*) filter (where event = 'product_view') as views,
          count(*) filter (where event = 'add_to_bag') as adds
        from e where product_id is not null and event in ('product_view', 'add_to_bag')
        group by product_id
        having count(*) filter (where event = 'product_view') >= 20
        order by count(*) filter (where event = 'add_to_bag')::numeric / count(*) filter (where event = 'product_view'),
          count(*) filter (where event = 'product_view') desc
        limit 20
      ) t
      join public.products p on p.id = t.product_id
      left join lateral (
        select sum(oi.quantity) as sold
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.product_variants v on v.id = oi.variant_id
        where v.product_id = t.product_id and o.created_at >= v_from
          and o.status not in ('cancelled', 'returned')
      ) s on true
      -- stock on hand, and how many of the piece's active variants (size x colour)
      -- still have any: one size left means most visitors can't buy it
      left join lateral (
        select sum(z.q) as stock, count(*) filter (where z.q > 0) as variants_left, count(*) as variants
        from (
          select v.id, coalesce(sum(il.quantity), 0) as q
          from public.product_variants v
          left join public.inventory_levels il on il.variant_id = v.id
          where v.product_id = t.product_id and v.is_active
          group by v.id
        ) z
      ) st on true
    ), '[]'::jsonb),
    'searches', coalesce((
      select jsonb_agg(jsonb_build_object('len', s.len, 'hits', s.hits, 'n', s.n) order by s.n desc)
      from (
        select coalesce(meta ->> 'len', '?') as len, coalesce(meta ->> 'hits', '?') as hits, count(*) as n
        from e where event = 'search' group by 1, 2
      ) s
    ), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$function$;
