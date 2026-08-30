-- BACH foundations: roles, branches, profiles, currency, TVA, payment methods.
-- RLS on everything; server-side checks are the second layer, never the only one.

create type public.app_role as enum (
  'super_admin', 'store_manager', 'inventory_manager',
  'cashier', 'support_agent', 'marketing_manager'
);

create type public.season as enum ('winter', 'spring', 'summer', 'autumn', 'all_season');

create type public.payment_kind as enum ('cash', 'cod', 'whish', 'stripe');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'cashier',
  full_name text,
  branch_id uuid references public.branches (id),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role lookup for RLS policies. SECURITY DEFINER so policies on profiles
-- itself don't recurse.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

-- Manual-managed rate with full history; every transaction captures the
-- rate row it was priced at.
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  lbp_per_usd numeric(14, 2) not null check (lbp_per_usd > 0),
  effective_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

-- Single-row settings table (id is always true).
create table public.tva_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  rate_basis_points integer not null default 1100
    check (rate_basis_points between 0 and 10000),
  prices_include_tva boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.tva_settings (id) values (true);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  kind public.payment_kind not null unique,
  display_name_en text not null,
  display_name_ar text not null,
  is_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Stripe rows exist from day one but stay disabled until the CR is issued;
-- activation is a settings flip, not a code change.
insert into public.payment_methods (kind, display_name_en, display_name_ar, is_enabled) values
  ('cash',   'Cash',                    'كاش',                   true),
  ('cod',    'Cash on Delivery',        'الدفع عند الاستلام',    true),
  ('whish',  'Whish Money',             'ويش موني',              false),
  ('stripe', 'Card (Visa / Mastercard)','بطاقة (فيزا / ماستركارد)', false);

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.tva_settings enable row level security;
alter table public.payment_methods enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "super admin manages profiles" on public.profiles
  for all to authenticated
  using (public.current_app_role() = 'super_admin')
  with check (public.current_app_role() = 'super_admin');

create policy "staff read branches" on public.branches
  for select to authenticated
  using (true);

create policy "super admin manages branches" on public.branches
  for all to authenticated
  using (public.current_app_role() = 'super_admin')
  with check (public.current_app_role() = 'super_admin');

create policy "staff read exchange rates" on public.exchange_rates
  for select to authenticated
  using (true);

create policy "managers set exchange rates" on public.exchange_rates
  for insert to authenticated
  with check (public.current_app_role() in ('super_admin', 'store_manager'));

create policy "staff read tva settings" on public.tva_settings
  for select to authenticated
  using (true);

create policy "super admin updates tva settings" on public.tva_settings
  for update to authenticated
  using (public.current_app_role() = 'super_admin')
  with check (public.current_app_role() = 'super_admin');

-- Storefront (anon) may see which methods are available at checkout.
create policy "anyone reads enabled payment methods" on public.payment_methods
  for select to anon, authenticated
  using (is_enabled or public.current_app_role() = 'super_admin');

create policy "super admin manages payment methods" on public.payment_methods
  for all to authenticated
  using (public.current_app_role() = 'super_admin')
  with check (public.current_app_role() = 'super_admin');
