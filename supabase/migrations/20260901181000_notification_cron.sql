-- Drain the notification queue every minute via pg_cron + pg_net.
-- The notify function is deployed with --no-verify-jwt: it only drains
-- an idempotent queue, so an unauthenticated ping is harmless.
-- Guarded so local stacks without the extensions don't fail the migration.

do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'cron/net extensions unavailable here (%), skipping schedule', sqlerrm;
  return;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('drain-notifications');
  end if;
exception when others then null;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule(
      'drain-notifications',
      '* * * * *',
      $cron$
      select net.http_post(
        url := 'https://hrosyuaehkhzhnvefhts.supabase.co/functions/v1/notify',
        body := '{}'::jsonb
      )
      where exists (select 1 from public.notification_log where status = 'queued')
      $cron$
    );
  end if;
end $$;
