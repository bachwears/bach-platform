-- Outfits: curated looks made of existing products (spec:
-- docs/superpowers/specs/2026-10-13-outfits-design.md, plan 1).
--
-- An outfit has its own page, photos, barcode and optional special price, but
-- no stock or variants of its own: selling it records the pieces' own
-- variants on order_items, tagged with the outfit and each piece's share of
-- the discount. price_cart() is the one pricing function both checkouts use.

-- 1 ── tables ─────────────────────────────────────────────────────────────────
create type public.outfit_price_kind as enum ('sum', 'percent', 'fixed');
create type public.outfit_promo_mode as enum ('exclude', 'stack', 'best');
create type public.outfit_sell_mode as enum ('flexible', 'whole', 'exclusive');

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  status public.product_status not null default 'draft',
  -- sum: the pieces' current prices · percent: % off their full prices · fixed: one price
  price_kind public.outfit_price_kind not null default 'sum',
  percent_off integer check (percent_off between 1 and 90),
  fixed_usd_cents integer check (fixed_usd_cents > 0),
  -- promo codes on a discounted outfit: not applied (default), both, or the bigger one
  promo_mode public.outfit_promo_mode not null default 'exclude',
  -- flexible: pieces can be left out · whole: complete look only · exclusive: the
  -- pieces are never sold on their own
  sell_mode public.outfit_sell_mode not null default 'flexible',
  barcode text unique,
  meta_title_en text,
  meta_description_en text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_kind <> 'percent' or percent_off is not null),
  check (price_kind <> 'fixed' or fixed_usd_cents is not null)
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  -- the colour the outfit photos show; the customer may pick another
  default_color_code text,
  sort integer not null default 0,
  primary key (outfit_id, product_id)
);
create index outfit_items_product on public.outfit_items (product_id);

create table public.outfit_media (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  storage_path text not null,
  sort integer not null default 0,
  is_main boolean not null default false,
  alt_en text,
  created_at timestamptz not null default now()
);
create index outfit_media_outfit on public.outfit_media (outfit_id, sort);

-- a saved outfit (favourites; wishlists is keyed by product, so outfits get their own)
create table public.outfit_favourites (
  customer_id uuid not null references public.customers (id) on delete cascade,
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, outfit_id)
);

-- sold and returned lines remember their outfit and the piece's share of its discount
alter table public.order_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0 check (outfit_discount_cents >= 0);
alter table public.order_return_items
  add column outfit_id uuid references public.outfits (id) on delete set null,
  add column outfit_group uuid,
  add column outfit_discount_cents integer not null default 0;

-- barcode from the in-store EAN-13 range (like variants), updated_at on change
create or replace function public.outfits_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.barcode is null or btrim(new.barcode) = '' then
    new.barcode := public.next_internal_ean();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger outfits_defaults before insert or update on public.outfits
  for each row execute function public.outfits_defaults();

-- 2 ── access ─────────────────────────────────────────────────────────────────
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_media enable row level security;
alter table public.outfit_favourites enable row level security;

create policy outfits_read on public.outfits for select
  using (status = 'published' or public.is_staff());
create policy outfits_write on public.outfits for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy outfit_items_read on public.outfit_items for select
  using (exists (select 1 from public.outfits o where o.id = outfit_id and (o.status = 'published' or public.is_staff())));
create policy outfit_items_write on public.outfit_items for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy outfit_media_read on public.outfit_media for select
  using (exists (select 1 from public.outfits o where o.id = outfit_id and (o.status = 'published' or public.is_staff())));
create policy outfit_media_write on public.outfit_media for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy outfit_favourites_own on public.outfit_favourites for all
  using (customer_id in (select c.id from public.customers c where c.auth_user_id = auth.uid()))
  with check (customer_id in (select c.id from public.customers c where c.auth_user_id = auth.uid()));
create policy outfit_favourites_staff on public.outfit_favourites for select using (public.is_staff());
