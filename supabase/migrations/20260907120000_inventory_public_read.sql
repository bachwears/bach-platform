-- Storefront availability was invisible to anon/customer sessions: RLS on
-- inventory_levels only allowed staff, so every PDP read as sold out in prod
-- (local testing masked it — localhost sessions carried staff cookies).
-- Stock counts are already surfaced in the UI ("only N left"), so a public
-- read is intentional, not a leak.

create policy "inventory_public_read" on public.inventory_levels
  for select using (true);
