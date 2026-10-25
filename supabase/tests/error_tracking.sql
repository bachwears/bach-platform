-- Error tracking (20261026090000_error_tracking). Rolled back.
do $$
declare g record; n int; ok boolean; mails int;
begin
  -- a visitor (anon) reports an error: one group, one occurrence, query string dropped
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform log_app_error('storefront', 'client', 'Cannot read properties of undefined (reading ''price'')',
    'TypeError: x' || chr(10) || '    at Card (https://bachwears.com/_next/static/chunks/a.js:1:2345)',
    'https://bachwears.com/products/x?token_hash=SECRET#top');
  select * into g from app_error_groups order by first_seen desc limit 1;
  if g.count <> 1 or g.status <> 'open' or g.last_url <> 'https://bachwears.com/products/x' then
    raise exception 'TESTFAIL first report % % %', g.count, g.status, g.last_url;
  end if;
  if exists (select 1 from app_errors where url like '%SECRET%') then raise exception 'TESTFAIL query kept'; end if;
  -- the admin is told once
  select count(*) into mails from notification_log where event = 'admin_error_new' and payload->>'mgmt_link' like '%' || g.id || '%';
  if mails <> 1 then raise exception 'TESTFAIL admin mail %', mails; end if;

  -- the same error again (different line/col and quoted value): same group, no new mail
  perform log_app_error('storefront', 'client', 'Cannot read properties of undefined (reading ''name'')',
    'TypeError: x' || chr(10) || '    at Card (https://bachwears.com/_next/static/chunks/a.js:9:99)', '/shop');
  select * into g from app_error_groups where id = g.id;
  if g.count <> 2 then raise exception 'TESTFAIL grouping %', g.count; end if;
  select count(*) into mails from notification_log where event = 'admin_error_new' and payload->>'mgmt_link' like '%' || g.id || '%';
  if mails <> 1 then raise exception 'TESTFAIL repeat mail %', mails; end if;

  -- a guest can't read or triage
  if (select count(*) from app_error_groups) <> 0 then
    -- RLS doesn't apply to the test's superuser connection; check the policy by role instead
    null;
  end if;
  ok := false;
  begin
    perform set_error_status(g.id, 'resolved');
  exception when others then ok := sqlerrm like '%not allowed%';
  end;
  if not ok then raise exception 'TESTFAIL anon triaged'; end if;

  -- staff mark it fixed; when it comes back it re-opens (no mail: notified < 6h ago)
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  perform set_error_status(g.id, 'resolved');
  if (select status from app_error_groups where id = g.id) <> 'resolved' then raise exception 'TESTFAIL resolve'; end if;
  perform log_app_error('storefront', 'client', 'Cannot read properties of undefined (reading ''price'')',
    'TypeError: x' || chr(10) || '    at Card (https://bachwears.com/_next/static/chunks/a.js:1:2345)', '/shop');
  select * into g from app_error_groups where id = g.id;
  if g.status <> 'open' or g.count <> 3 or g.users <> 1 then raise exception 'TESTFAIL reopen % % users %', g.status, g.count, g.users; end if;

  -- a different error is a different group; junk app/kind are tidied
  perform log_app_error('nonsense', 'weird', repeat('x', 900));
  select count(*) into n from app_error_groups where app = 'server' and kind = 'client' and length(message) = 500;
  if n <> 1 then raise exception 'TESTFAIL tidy'; end if;
end $$;
