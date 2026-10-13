-- Outfit analytics (plan 3): two events, outfit_view and outfit_add. The look
-- travels in meta ({"outfit": slug}); product_id stays empty for them.

alter table public.site_events drop constraint site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event = any (array[
  'page_view', 'product_view', 'add_to_bag', 'rec_click', 'bag_view',
  'checkout_start', 'order_placed', 'delivery_bar_seen', 'search',
  'outfit_view', 'outfit_add'
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
    'outfit_view', 'outfit_add'
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
