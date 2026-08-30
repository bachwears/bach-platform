-- Called by the apps after a successful auth password update; clears the
-- forced-change flag for the caller only. SECURITY DEFINER because profiles
-- has no self-update policy (staff must not edit their own role/branch).
create or replace function public.password_changed()
returns void
language sql security definer
set search_path = public
as $$
  update public.profiles
  set must_change_password = false, updated_at = now()
  where id = auth.uid()
$$;

revoke all on function public.password_changed() from public;
grant execute on function public.password_changed() to authenticated;
