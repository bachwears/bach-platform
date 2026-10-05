-- "Wear with": pieces staff pair with a product (2–4, in order), shown under the
-- product page photos with one-tap quick add. Picked in MGMT on the product page.
create table if not exists public.product_pairings (
  product_id uuid not null references public.products (id) on delete cascade,
  paired_id uuid not null references public.products (id) on delete cascade,
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, paired_id),
  check (product_id <> paired_id)
);
create index if not exists product_pairings_paired_idx on public.product_pairings (paired_id);

alter table public.product_pairings enable row level security;

-- Anyone may read a pairing; the product page only shows published pieces anyway.
create policy "read pairings" on public.product_pairings
  for select to anon, authenticated using (true);

-- Same roles that edit products.
create policy "catalog managers write pairings" on public.product_pairings
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

grant select on public.product_pairings to anon, authenticated;
grant insert, update, delete on public.product_pairings to authenticated;
