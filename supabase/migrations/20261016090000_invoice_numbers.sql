-- Gapless invoice numbers (founder 2026-10-16).
-- Order numbers come from a sequence, which skips a value whenever a checkout
-- fails and rolls back (and test orders were deleted), so they jump: 30, 44…
-- Every sale — shop or online — now also gets an invoice number from a counter
-- row that is updated inside the same transaction as the order: a rolled-back
-- checkout gives its number back, so invoices run 1, 2, 3… with no holes.
-- The order number stays as the customer's tracking reference.
-- Invoices are kept for good: a cancelled order keeps its invoice (shown as
-- cancelled), the number never changes, and the order can't be deleted.

create table public.invoice_counters (
  series text primary key,
  last_number bigint not null default 0 check (last_number >= 0)
);
alter table public.invoice_counters enable row level security;
-- no policies: only the trigger below (security definer) touches it

alter table public.orders
  add column invoice_number bigint unique,
  add column invoiced_at timestamptz;

-- existing sales, numbered in the order they happened
with numbered as (
  select id, row_number() over (order by created_at, number) as n
  from public.orders
)
update public.orders o
set invoice_number = numbered.n, invoiced_at = o.created_at
from numbered
where numbered.id = o.id;

insert into public.invoice_counters (series, last_number)
select 'main', coalesce(max(invoice_number), 0) from public.orders;

create or replace function public._assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null then
    -- the row lock serialises concurrent sales; a rollback releases the number
    update public.invoice_counters
    set last_number = last_number + 1
    where series = 'main'
    returning last_number into new.invoice_number;
    if new.invoice_number is null then
      raise exception 'invoice counter missing';
    end if;
  end if;
  new.invoiced_at := coalesce(new.invoiced_at, now());
  return new;
end $$;

create trigger orders_invoice_number
before insert on public.orders
for each row execute function public._assign_invoice_number();

create or replace function public._keep_invoices()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.invoice_number is not null then
      raise exception 'invoices are kept: cancel the order instead of deleting it';
    end if;
    return old;
  end if;
  if old.invoice_number is not null and new.invoice_number is distinct from old.invoice_number then
    raise exception 'an invoice number never changes';
  end if;
  return new;
end $$;

create trigger orders_keep_invoice_number
before update of invoice_number on public.orders
for each row execute function public._keep_invoices();

create trigger orders_keep_invoices
before delete on public.orders
for each row execute function public._keep_invoices();

create index orders_invoiced_at_idx on public.orders (invoiced_at desc);
