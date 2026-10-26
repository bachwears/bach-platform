-- Supabase limits tracker (founder 2026-10-27), after cached egress ran to 5x
-- the Pro quota unnoticed (2026-10-25).
--   * platform_usage_daily — one row per UTC day and metric, written every hour
--     by .github/workflows/usage-monitor.yml (scripts/usage-monitor.py reads the
--     Supabase logs through the Management API and calls record_platform_usage).
--   * platform_limits — the plan's monthly allowances (Pro), editable.
--   * platform_usage_summary() — MGMT → حدود Supabase: this billing cycle's use
--     of each limit (logged metrics summed, database / storage / MAU measured
--     live), the pace to the end of the cycle, and 30 days of photo traffic.
--   * check_usage_alerts() — emails the admin once per cycle when a limit passes
--     70 %, 90 % or 100 %, when the pace says it will run over, and on any day
--     whose photo traffic is 3x the previous week's average.

create table public.platform_limits (
  metric text primary key,
  label text not null,
  unit text not null,
  monthly_limit numeric not null check (monthly_limit > 0),
  -- 'sum' = added up over the billing cycle; 'live' = measured now
  kind text not null check (kind in ('sum', 'live')),
  sort integer not null default 0
);

insert into public.platform_limits (metric, label, unit, monthly_limit, kind, sort) values
  ('cached_egress_gb', 'تحميل الصور (Cached Egress)', 'GB', 250, 'sum', 1),
  ('storage_gb', 'حجم الملفات (Storage)', 'GB', 100, 'live', 2),
  ('db_size_gb', 'حجم الداتابيز', 'GB', 8, 'live', 3),
  ('mau', 'زباين سجّلو دخول هالشهر (MAU)', 'users', 100000, 'live', 4),
  ('edge_invocations', 'تشغيل الـEdge Functions', 'calls', 2000000, 'sum', 5);

create table public.platform_usage_daily (
  day date not null,
  metric text not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, metric)
);

create table public.platform_usage_settings (
  id boolean primary key default true check (id),
  -- the billing cycle starts on this day of the month (Supabase: 14 Oct → 14 Nov)
  cycle_day integer not null default 14 check (cycle_day between 1 and 28),
  last_run_at timestamptz
);
insert into public.platform_usage_settings default values;

create table public.platform_usage_alerts (
  cycle_start date not null,
  metric text not null,
  level text not null,
  sent_at timestamptz not null default now(),
  primary key (cycle_start, metric, level)
);

alter table public.platform_limits enable row level security;
alter table public.platform_usage_daily enable row level security;
alter table public.platform_usage_settings enable row level security;
alter table public.platform_usage_alerts enable row level security;
create policy platform_limits_read on public.platform_limits
  for select using (public.current_app_role() in ('super_admin', 'store_manager'));
create policy platform_usage_daily_read on public.platform_usage_daily
  for select using (public.current_app_role() in ('super_admin', 'store_manager'));

/** The billing cycle containing a day: [start, end). */
create or replace function public._usage_cycle(p_day date default (now() at time zone 'utc')::date)
returns table (cycle_start date, cycle_end date)
language sql
stable
set search_path = public
as $$
  with s as (select cycle_day from public.platform_usage_settings limit 1),
  this_month as (
    select make_date(extract(year from p_day)::int, extract(month from p_day)::int, (select cycle_day from s)) as d
  )
  select
    case when p_day >= d then d else (d - interval '1 month')::date end,
    case when p_day >= d then (d + interval '1 month')::date else d end
  from this_month;
$$;

/** Measured-now metrics (database size, storage, MAU) for the current cycle. */
create or replace function public._usage_live(p_cycle_start date)
returns table (metric text, value numeric)
language sql
stable
security definer
set search_path = public
as $$
  select 'db_size_gb', round(pg_database_size(current_database()) / 1e9, 3)
  union all
  select 'storage_gb', round(coalesce(sum((metadata ->> 'size')::bigint), 0) / 1e9, 3) from storage.objects
  union all
  select 'mau', count(*)::numeric from auth.users where last_sign_in_at >= p_cycle_start;
$$;
revoke all on function public._usage_live(date) from public;

/** The hourly job's write: [{"day":"2026-10-27","metric":"cached_egress_gb","value":7.1}, …]. */
create or replace function public.record_platform_usage(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.platform_usage_daily (day, metric, value, updated_at)
  select (r ->> 'day')::date, r ->> 'metric', (r ->> 'value')::numeric, now()
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  where r ->> 'metric' is not null and r ->> 'day' is not null
  on conflict (day, metric) do update set value = excluded.value, updated_at = now();
  update public.platform_usage_settings set last_run_at = now();
  perform public.check_usage_alerts();
end $$;
-- only the job (Management API, as postgres) calls it
revoke all on function public.record_platform_usage(jsonb) from public, anon, authenticated;

create or replace function public._usage_rows()
returns table (metric text, label text, unit text, kind text, monthly_limit numeric, used numeric, projected numeric, sort integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v_today date := (now() at time zone 'utc')::date;
  v_elapsed numeric;
  v_total numeric;
begin
  select * into c from public._usage_cycle(v_today);
  v_total := c.cycle_end - c.cycle_start;
  -- days of the cycle gone, counting today as the hours it has had
  v_elapsed := greatest((v_today - c.cycle_start) + extract(hour from now() at time zone 'utc') / 24.0, 0.25);
  return query
  select l.metric, l.label, l.unit, l.kind, l.monthly_limit,
         coalesce(u.used, 0) as used,
         case when l.kind = 'sum' then round(coalesce(u.used, 0) / v_elapsed * v_total, 3) else coalesce(u.used, 0) end,
         l.sort
  from public.platform_limits l
  left join lateral (
    select case when l.kind = 'sum'
             then (select sum(d.value) from public.platform_usage_daily d
                   where d.metric = l.metric and d.day >= c.cycle_start and d.day < c.cycle_end)
             else (select lv.value from public._usage_live(c.cycle_start) lv where lv.metric = l.metric)
           end as used
  ) u on true;
end $$;
revoke all on function public._usage_rows() from public;

/** MGMT → حدود Supabase. */
create or replace function public.platform_usage_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v_first date;
begin
  if coalesce(public.current_app_role()::text, '') not in ('super_admin', 'store_manager') then
    raise exception 'not allowed';
  end if;
  select * into c from public._usage_cycle();
  select min(day) into v_first from public.platform_usage_daily where day >= c.cycle_start;
  return jsonb_build_object(
    'cycle_start', c.cycle_start,
    'cycle_end', c.cycle_end,
    'data_from', v_first,
    'last_run_at', (select last_run_at from public.platform_usage_settings limit 1),
    'metrics', (select coalesce(jsonb_agg(to_jsonb(r) order by r.sort), '[]'::jsonb) from public._usage_rows() r),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'gb', d.value, 'visitors',
               (select v.value from public.platform_usage_daily v where v.day = d.day and v.metric = 'photo_visitors')) order by d.day), '[]'::jsonb)
      from public.platform_usage_daily d
      where d.metric = 'cached_egress_gb' and d.day > (now() at time zone 'utc')::date - 31
    )
  );
end $$;
revoke all on function public.platform_usage_summary() from public;
grant execute on function public.platform_usage_summary() to authenticated;

create or replace function public.check_usage_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  r record;
  v_level text;
  v_admin text := public._admin_notify_email();
  v_today date := (now() at time zone 'utc')::date;
  v_today_gb numeric;
  v_week_avg numeric;
  v_pct numeric;
  v_left integer;
begin
  if v_admin is null then return; end if;
  select * into c from public._usage_cycle(v_today);
  v_left := c.cycle_end - v_today;
  for r in select * from public._usage_rows() loop
    v_pct := round(r.used / r.monthly_limit * 100);
    v_level := case when v_pct >= 100 then '100' when v_pct >= 90 then '90' when v_pct >= 70 then '70'
                    when r.kind = 'sum' and r.projected > r.monthly_limit and v_today - c.cycle_start >= 2 then 'pace'
                    else null end;
    continue when v_level is null;
    -- once per cycle, metric and level
    insert into public.platform_usage_alerts (cycle_start, metric, level) values (c.cycle_start, r.metric, v_level)
    on conflict do nothing;
    continue when not found;
    perform public._enqueue_notification('admin_usage_alert', 'email', v_admin, 'en', jsonb_build_object(
      'metric', r.label,
      'used', trim(to_char(r.used, 'FM999G999G990D0')) || ' ' || r.unit,
      'limit', trim(to_char(r.monthly_limit, 'FM999G999G990')) || ' ' || r.unit,
      'pct', v_pct || '%',
      'state', case v_level when 'pace' then 'is on pace to go over the monthly allowance (about '
                   || trim(to_char(r.projected, 'FM999G999G990')) || ' ' || r.unit || ' by the end of the cycle)'
                   else 'has passed ' || v_level || '% of the monthly allowance' end,
      'days_left', v_left,
      'mgmt_link', 'https://mgmt.bachwears.com/usage'
    ));
  end loop;

  -- a sudden jump in photo traffic (what a heavy upload or a bot looks like)
  select value into v_today_gb from public.platform_usage_daily where day = v_today and metric = 'cached_egress_gb';
  select avg(value) into v_week_avg from public.platform_usage_daily
  where metric = 'cached_egress_gb' and day between v_today - 7 and v_today - 1;
  if v_today_gb > 5 and v_week_avg > 0 and v_today_gb > 3 * v_week_avg then
    insert into public.platform_usage_alerts (cycle_start, metric, level)
    values (c.cycle_start, 'cached_egress_spike', v_today::text)
    on conflict do nothing;
    if found then
      perform public._enqueue_notification('admin_usage_alert', 'email', v_admin, 'en', jsonb_build_object(
        'metric', 'Photo traffic today',
        'used', round(v_today_gb, 1) || ' GB',
        'limit', round(v_week_avg, 1) || ' GB a day last week',
        'pct', round(v_today_gb / v_week_avg * 100) || '%',
        'state', 'jumped to more than 3x the usual daily amount',
        'days_left', v_left,
        'mgmt_link', 'https://mgmt.bachwears.com/usage'
      ));
    end if;
  end if;
end $$;
revoke all on function public.check_usage_alerts() from public, anon, authenticated;

insert into public.notification_templates (event, channel, lang, subject, body, is_enabled)
values (
  'admin_usage_alert', 'email', 'en',
  'BACH Supabase limit: {{metric}} {{pct}}',
  '{{metric}} {{state}}: {{used}} of {{limit}}. {{days_left}} days left in this billing cycle. See every limit: {{mgmt_link}}',
  true
)
on conflict do nothing;
