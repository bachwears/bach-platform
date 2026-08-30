-- Catalog + inventory foundations (CLAUDE.md §4, §8, §13 delta):
-- categories/products/variants/collections, multi-season tagging with date
-- windows, SKU generator (BW-{CAT}-{SEQ}-{SIZE}{COLOR}) via sku_sequences,
-- media slots (front/back/side/closeup), branch-aware inventory driven by
-- append-only movements. RLS everywhere + explicit grants (auto-expose off).

create type public.product_status as enum ('draft', 'published', 'archived');
create type public.media_kind as enum ('front', 'back', 'side', 'closeup', 'other');
create type public.movement_reason as enum (
  'purchase', 'sale', 'return', 'exchange',
  'transfer_in', 'transfer_out', 'adjustment', 'count'
);

-- Staff = has a profiles row. Customers authenticate too but have no profile,
-- so current_app_role() is null for them and they read like anon.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_app_role() is not null $$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2,4}$'),
  name_en text not null,
  name_ar text not null,
  parent_id uuid references public.categories (id),
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  category_id uuid not null references public.categories (id),
  price_usd_cents integer not null check (price_usd_cents >= 0),
  sale_price_usd_cents integer check (
    sale_price_usd_cents >= 0 and sale_price_usd_cents <= price_usd_cents
  ),
  material_en text,
  material_ar text,
  care_en text,
  care_ar text,
  fit text,
  tags text[] not null default '{}',
  occasions text[] not null default '{}',
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_tags_gin on public.products using gin (tags);
create index products_occasions_gin on public.products using gin (occasions);

-- Season merchandising windows (§5 one-click season flip reads these).
create table public.season_windows (
  season public.season primary key,
  starts_on date,
  ends_on date
);

insert into public.season_windows (season) values
  ('winter'), ('spring'), ('summer'), ('autumn'), ('all_season');

create table public.product_seasons (
  product_id uuid not null references public.products (id) on delete cascade,
  season public.season not null,
  primary key (product_id, season)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  color_code text not null check (color_code ~ '^[A-Z]{2,3}$'),
  color_en text not null,
  color_ar text not null,
  sku text unique,
  barcode text unique,
  price_usd_cents_override integer check (price_usd_cents_override >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, size, color_code)
);

create table public.sku_sequences (
  category_code text primary key references public.categories (code),
  next_seq integer not null default 1
);

-- Sequential per-category counter; row lock on update keeps it race-safe.
create or replace function public.next_sku_seq(cat_code text)
returns integer language plpgsql security definer set search_path = public
as $$
declare seq integer;
begin
  insert into public.sku_sequences (category_code) values (cat_code)
  on conflict (category_code) do nothing;

  update public.sku_sequences
  set next_seq = next_seq + 1
  where category_code = cat_code
  returning next_seq - 1 into seq;

  return seq;
end;
$$;
revoke all on function public.next_sku_seq(text) from public;

-- Auto-generate SKU/barcode on variant insert (manual override allowed by
-- providing sku explicitly). Scheme: BW-{CAT}-{SEQ4}-{SIZE}{COLOR}.
create or replace function public.generate_variant_sku()
returns trigger language plpgsql security definer set search_path = public
as $$
declare cat_code text;
begin
  if new.sku is null then
    select c.code into cat_code
    from public.products p
    join public.categories c on c.id = p.category_id
    where p.id = new.product_id;

    new.sku := 'BW-' || cat_code || '-'
      || lpad(public.next_sku_seq(cat_code)::text, 4, '0') || '-'
      || upper(regexp_replace(new.size, '\s', '', 'g')) || new.color_code;
  end if;

  if new.barcode is null then
    new.barcode := new.sku;
  end if;

  return new;
end;
$$;

create trigger product_variants_sku
  before insert on public.product_variants
  for each row execute function public.generate_variant_sku();

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null,
  alt_en text,
  alt_ar text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- One asset per photo slot; extra shots go under 'other'.
create unique index media_assets_slot_idx
  on public.media_assets (product_id, kind) where kind <> 'other';

create table public.inventory_levels (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  reorder_threshold integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (variant_id, branch_id),
  check (reserved <= quantity)
);

-- Stock changes ONLY through movements (append-only audit trail).
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id),
  branch_id uuid not null references public.branches (id),
  delta integer not null check (delta <> 0),
  reason public.movement_reason not null,
  note text,
  reference_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx
  on public.inventory_movements (variant_id, branch_id, created_at);

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.inventory_levels (variant_id, branch_id, quantity)
  values (new.variant_id, new.branch_id, greatest(new.delta, 0))
  on conflict (variant_id, branch_id) do update
  set quantity = public.inventory_levels.quantity + new.delta,
      updated_at = now();
  return new;
end;
$$;

create trigger inventory_movements_apply
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ---------------------------------------------------------------- RLS

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.season_windows enable row level security;
alter table public.product_seasons enable row level security;
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.sku_sequences enable row level security;
alter table public.media_assets enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;

-- Catalog readers: everyone sees published; staff see everything.
create policy "read active categories" on public.categories
  for select to anon, authenticated
  using (is_active or public.is_staff());

create policy "read products" on public.products
  for select to anon, authenticated
  using (status = 'published' or public.is_staff());

create policy "read season windows" on public.season_windows
  for select to anon, authenticated using (true);

create policy "read product seasons" on public.product_seasons
  for select to anon, authenticated using (true);

create policy "read active collections" on public.collections
  for select to anon, authenticated
  using (is_active or public.is_staff());

create policy "read product collections" on public.product_collections
  for select to anon, authenticated using (true);

create policy "read variants of visible products" on public.product_variants
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

create policy "read media of visible products" on public.media_assets
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

-- Catalog writers: super_admin, store_manager, marketing_manager.
create policy "catalog managers write categories" on public.categories
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write products" on public.products
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write product seasons" on public.product_seasons
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write collections" on public.collections
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write product collections" on public.product_collections
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write variants" on public.product_variants
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "catalog managers write media" on public.media_assets
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

create policy "super admin edits season windows" on public.season_windows
  for update to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager'));

-- Inventory: staff read; movements inserted by inventory-capable roles.
create policy "staff read inventory levels" on public.inventory_levels
  for select to authenticated using (public.is_staff());

create policy "staff read movements" on public.inventory_movements
  for select to authenticated using (public.is_staff());

create policy "inventory roles insert movements" on public.inventory_movements
  for insert to authenticated
  with check (
    public.current_app_role() in ('super_admin', 'store_manager', 'inventory_manager', 'cashier')
    and created_by = auth.uid()
  );

-- sku_sequences: no policies for anon/authenticated — function access only.

-- ---------------------------------------------------------------- grants
-- (auto-expose disabled in prod: every table needs explicit grants)

grant select on public.categories, public.products, public.season_windows,
  public.product_seasons, public.collections, public.product_collections,
  public.product_variants, public.media_assets
  to anon, authenticated;

grant insert, update, delete on public.categories, public.products,
  public.product_seasons, public.collections, public.product_collections,
  public.product_variants, public.media_assets
  to authenticated;

grant update on public.season_windows to authenticated;
grant select on public.inventory_levels to authenticated;
grant select, insert on public.inventory_movements to authenticated;
