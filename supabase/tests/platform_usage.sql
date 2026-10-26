-- Supabase limits tracker (20261027100000_platform_usage). Rolled back.
do $$
declare s jsonb; c record; m jsonb; n int; ok boolean; today date := (now() at time zone 'utc')::date;
begin
  select * into c from _usage_cycle(today);
  if not (today >= c.cycle_start and today < c.cycle_end) then raise exception 'TESTFAIL cycle'; end if;
  if _usage_cycle('2026-10-13') <> row('2026-09-14'::date, '2026-10-14'::date) then raise exception 'TESTFAIL cycle before day'; end if;

  -- the job writes days; re-writing a day replaces it
  perform record_platform_usage(jsonb_build_array(
    jsonb_build_object('day', today - 1, 'metric', 'cached_egress_gb', 'value', 2),
    jsonb_build_object('day', today, 'metric', 'cached_egress_gb', 'value', 1)));
  perform record_platform_usage(jsonb_build_array(jsonb_build_object('day', today, 'metric', 'cached_egress_gb', 'value', 3)));
  select sum(value) into n from platform_usage_daily where metric = 'cached_egress_gb' and day >= greatest(c.cycle_start, today - 1);
  if n <> 5 then raise exception 'TESTFAIL upsert %', n; end if;

  -- staff read the summary; a guest can't
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  s := platform_usage_summary();
  select x into m from jsonb_array_elements(s->'metrics') x where x->>'metric' = 'cached_egress_gb';
  if (m->>'used')::numeric < 5 or (m->>'monthly_limit')::numeric <> 250 then raise exception 'TESTFAIL summary %', m; end if;
  select x into m from jsonb_array_elements(s->'metrics') x where x->>'metric' = 'db_size_gb';
  if (m->>'used')::numeric <= 0 then raise exception 'TESTFAIL live db size'; end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  ok := false;
  begin perform platform_usage_summary(); exception when others then ok := sqlerrm like '%not allowed%'; end;
  if not ok then raise exception 'TESTFAIL anon summary'; end if;

  -- a limit past 90%: one email, not two
  update platform_limits set monthly_limit = 5.2 where metric = 'cached_egress_gb';
  perform check_usage_alerts();
  perform check_usage_alerts();
  select count(*) into n from notification_log where event = 'admin_usage_alert' and payload->>'pct' = '96%';
  if n <> 1 then raise exception 'TESTFAIL alert count %', n; end if;

  -- a spike: today 3x+ the week before (and over 5 GB)
  update platform_limits set monthly_limit = 100000 where metric = 'cached_egress_gb';
  perform record_platform_usage(jsonb_build_array(jsonb_build_object('day', today, 'metric', 'cached_egress_gb', 'value', 40)));
  select count(*) into n from notification_log where event = 'admin_usage_alert' and payload->>'metric' = 'Photo traffic today';
  if n <> 1 then raise exception 'TESTFAIL spike %', n; end if;
end $$;
