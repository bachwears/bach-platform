-- End-of-day close-outs: expected vs counted drawer cash, per branch per day.

create table public.eod_closeouts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  business_date date not null,
  closed_by uuid references public.profiles (id),
  orders_count integer not null default 0,
  gross_usd_cents integer not null default 0,
  discounts_usd_cents integer not null default 0,
  tva_usd_cents integer not null default 0,
  cash_in_usd_cents bigint not null default 0,
  cash_in_lbp bigint not null default 0,
  cash_out_usd_cents bigint not null default 0,
  cash_out_lbp bigint not null default 0,
  expected_usd_cents bigint not null default 0,
  expected_lbp bigint not null default 0,
  counted_usd_cents bigint not null default 0,
  counted_lbp bigint not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (branch_id, business_date)
);

alter table public.eod_closeouts enable row level security;

create policy "staff read closeouts" on public.eod_closeouts
  for select to authenticated using (public.is_staff());

create policy "cashiers close the day" on public.eod_closeouts
  for insert to authenticated
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'cashier'));
