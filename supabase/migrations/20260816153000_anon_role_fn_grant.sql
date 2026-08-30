-- The payment_methods RLS policy evaluates current_app_role() for anon too
-- (returns null when unauthenticated). Anon therefore needs EXECUTE on it.
grant execute on function public.current_app_role() to anon;
