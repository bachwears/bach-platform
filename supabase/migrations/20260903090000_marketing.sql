-- Marketing engine (§5): active-season merchandising, one-click campaign
-- rules (publish = set sale prices on matched products; end = restore),
-- popups. Promocodes CRUD rides the existing table.

create table public.merchandising_settings (
  id boolean primary key default true check (id),
  active_season public.season not null default 'all_season',
  updated_at timestamptz not null default now()
);
insert into public.merchandising_settings (active_season) values ('all_season');

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  percent_off integer not null check (percent_off between 1 and 90),
  target_kind text not null check (target_kind in ('all', 'season', 'category')),
  target_season public.season,
  target_category uuid references public.categories (id),
  starts_on date,
  ends_on date,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  affected_products jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_kind <> 'season' or target_season is not null),
  check (target_kind <> 'category' or target_category is not null)
);

create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  body_en text not null,
  cta_text text,
  cta_href text,
  is_active boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.merchandising_settings enable row level security;
alter table public.campaigns enable row level security;
alter table public.popups enable row level security;

create policy "everyone reads merchandising" on public.merchandising_settings
  for select to anon, authenticated using (true);
create policy "marketing sets season" on public.merchandising_settings
  for update to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "staff read campaigns" on public.campaigns
  for select to authenticated using (public.is_staff());
create policy "marketing manages campaigns" on public.campaigns
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "public reads active popups" on public.popups
  for select to anon, authenticated
  using (
    (is_active
      and (starts_on is null or starts_on <= current_date)
      and (ends_on is null or ends_on >= current_date))
    or public.is_staff()
  );
create policy "marketing manages popups" on public.popups
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

-- Publish: apply the discount as sale prices on matched products that
-- don't already carry one (manual sales are never clobbered).
create or replace function public.publish_campaign(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
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
      or (v_c.target_kind = 'category' and p.category_id = v_c.target_category)
      or (v_c.target_kind = 'season' and exists (
            select 1 from public.product_seasons ps
            where ps.product_id = p.id and ps.season = v_c.target_season))
    );

  update public.products
  set sale_price_usd_cents = greatest(round(price_usd_cents::numeric * (100 - v_c.percent_off) / 100)::integer, 0),
      updated_at = now()
  where id = any(v_ids);

  update public.campaigns
  set status = 'live', affected_products = to_jsonb(v_ids), updated_at = now()
  where id = p_id;

  return coalesce(array_length(v_ids, 1), 0);
end;
$$;

-- End: clear only the sale prices this campaign set.
create or replace function public.end_campaign(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_c record;
  v_count integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'marketing_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_c from public.campaigns where id = p_id for update;
  if v_c is null then raise exception 'campaign not found'; end if;
  if v_c.status <> 'live' then raise exception 'campaign is not live'; end if;

  update public.products
  set sale_price_usd_cents = null, updated_at = now()
  where id in (select (jsonb_array_elements_text(v_c.affected_products))::uuid);
  get diagnostics v_count = row_count;

  update public.campaigns set status = 'ended', updated_at = now() where id = p_id;
  return v_count;
end;
$$;

grant execute on function public.publish_campaign(uuid) to authenticated;
grant execute on function public.end_campaign(uuid) to authenticated;
revoke all on function public.publish_campaign(uuid) from public;
revoke all on function public.end_campaign(uuid) from public;

-- Scheduled sweep: auto-end campaigns past their end date (daily, with
-- the birthday sweep cadence).
create or replace function public.sweep_campaign_schedules()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_c record;
  v_n integer := 0;
begin
  for v_c in select id from public.campaigns where status = 'live' and ends_on is not null and ends_on < current_date
  loop
    update public.products set sale_price_usd_cents = null, updated_at = now()
    where id in (select (jsonb_array_elements_text((select affected_products from public.campaigns where id = v_c.id)))::uuid);
    update public.campaigns set status = 'ended', updated_at = now() where id = v_c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('campaign-schedules');
    exception when others then null;
    end;
    perform cron.schedule('campaign-schedules', '5 6 * * *',
      'select public.sweep_campaign_schedules()');
  end if;
end $$;

-- Promocode inserts for the marketing screen (updates already allowed).
-- (The manage policy on promocodes already covers insert via FOR ALL.)
