-- Campaigns on a category now cover its sub-categories too (2026-10-13).
-- Categories have three levels (Shoes & Accessories > Shoes > Boots); a
-- "20% off Shoes" campaign used to match only products filed directly on
-- Shoes, so every Boot and Trainer was skipped. Same function, one condition
-- changed: the category's whole subtree.

CREATE OR REPLACE FUNCTION public.publish_campaign(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c record;
  v_ids uuid[];
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'marketing_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_c from public.campaigns where id = p_id for update;
  if v_c is null then raise exception 'campaign not found'; end if;
  if v_c.status = 'live' then raise exception 'already live'; end if;

  select coalesce(array_agg(p.id), '{}') into v_ids
  from public.products p
  where p.sale_price_usd_cents is null
    and p.status <> 'archived'
    and (
      v_c.target_kind = 'all'
      -- a category campaign covers everything underneath it (Shoes → Boots, Trainers…)
      or (v_c.target_kind = 'category' and p.category_id in (
            with recursive sub as (
              select c.id from public.categories c where c.id = v_c.target_category
              union
              select c.id from public.categories c join sub on c.parent_id = sub.id
            )
            select id from sub))
      or (v_c.target_kind = 'season' and exists (
            select 1 from public.product_seasons ps
            where ps.product_id = p.id and ps.season = v_c.target_season))
    );

  update public.products
  set sale_price_usd_cents = greatest(round(price_usd_cents::numeric * (100 - v_c.percent_off) / 100)::integer, 0),
      updated_at = now()
  where id = any(v_ids);

  update public.campaigns
  set status = 'live', affected_products = to_jsonb(v_ids),
      applied_sale_prices = (
        select coalesce(jsonb_object_agg(p.id::text, p.sale_price_usd_cents), '{}'::jsonb)
        from public.products p where p.id = any(v_ids)
      ),
      updated_at = now()
  where id = p_id;

  return coalesce(array_length(v_ids, 1), 0);
end;
$function$;
