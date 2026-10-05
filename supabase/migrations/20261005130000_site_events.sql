-- First-party, cookie-free storefront analytics (MGMT → التحليلات). Measures the
-- merchandising features (shop price anchoring, free-delivery bar, "Similar items",
-- "Wear with", "Complete the look", the bag's add-ons) along the funnel
-- product view → add to bag → checkout started → order placed.
--
-- Privacy: no cookies or stored identifiers. The storefront server (/api/e)
-- computes visitor_hash = sha256(daily salt + ip + user agent + site), truncated;
-- the salt rotates every UTC day, so a visitor can't be followed across days and
-- neither the IP nor the user agent is ever stored. No personal data in any field.
create table if not exists public.site_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event text not null check (event in (
    'page_view', 'product_view', 'add_to_bag', 'rec_click', 'bag_view',
    'checkout_start', 'order_placed', 'delivery_bar_seen', 'search'
  )),
  path text check (char_length(path) <= 200),
  product_id uuid references public.products (id) on delete set null,
  -- where the click/add came from: 'similar', 'wear_with', 'complete_look', 'finishing', 'close_gap', 'shop_featured', 'search', …
  source text check (source ~ '^[a-z_]{1,32}$'),
  value_cents integer check (value_cents between 0 and 100000000),
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{16,64}$'),
  meta jsonb check (meta is null or (jsonb_typeof(meta) = 'object' and octet_length(meta::text) <= 1024))
);
create index if not exists site_events_created_idx on public.site_events (created_at);
create index if not exists site_events_event_created_idx on public.site_events (event, created_at);

alter table public.site_events enable row level security;
-- The base default privileges hand new tables to anon/authenticated: take them
-- back, writes go through track_event() only.
revoke all on public.site_events from anon, authenticated;
revoke all on sequence public.site_events_id_seq from anon, authenticated;
grant select on public.site_events to authenticated;

create policy "analytics roles read site events" on public.site_events
  for select to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

-- The only way in. Bad input is dropped quietly (returns false): the storefront
-- never shows a tracking error. At most 300 events per visitor hash per hour.
create or replace function public.track_event(
  p_event text,
  p_visitor_hash text,
  p_path text default null,
  p_product text default null,
  p_source text default null,
  p_value_cents integer default null,
  p_meta jsonb default null
)
 returns boolean
 language plpgsql
 volatile security definer
 set search_path to 'public'
as $function$
declare
  v_product uuid;
  v_hits integer;
begin
  if p_event is null or p_event not in (
    'page_view', 'product_view', 'add_to_bag', 'rec_click', 'bag_view',
    'checkout_start', 'order_placed', 'delivery_bar_seen', 'search'
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
revoke all on function public.track_event(text, text, text, text, text, integer, jsonb) from public;
grant execute on function public.track_event(text, text, text, text, text, integer, jsonb) to anon, authenticated;

-- Everything the MGMT analytics page shows, aggregated here (PostgREST caps row
-- reads at 1000). Days are UTC days, matching the daily salt: a "visitor" is one
-- hash on one day, so visitors over a range = the sum of daily visitors.
create or replace function public.site_analytics(p_days integer default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
revoke all on function public.site_analytics(integer) from public, anon;
grant execute on function public.site_analytics(integer) to authenticated;

-- Retention: events older than 400 days (enough for a year-on-year look). Not
-- scheduled — run by hand or from a future cron job with the service role.
create or replace function public.purge_site_events(p_keep_days integer default 400)
 returns integer
 language plpgsql
 volatile
 set search_path to 'public'
as $function$
declare
  v_n integer;
begin
  delete from public.site_events
  where created_at < now() - make_interval(days => greatest(coalesce(p_keep_days, 400), 30));
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;
revoke all on function public.purge_site_events(integer) from public, anon, authenticated;
grant execute on function public.purge_site_events(integer) to service_role;
