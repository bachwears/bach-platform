-- Loyal Account size preferences (CLAUDE.md §6: consented size + preferences).
-- Customer-editable through the existing "customer updates own profile" RLS
-- policy; guard_customer_self_update leaves these columns alone.

alter table public.customers
  add column if not exists size_top text
    check (size_top in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  add column if not exists size_bottom text
    check (size_bottom in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  add column if not exists size_shoe text
    check (size_shoe ~ '^(3[89]|4[0-7])$');

comment on column public.customers.size_top is 'Preferred tops size, set by the customer in their account';
comment on column public.customers.size_bottom is 'Preferred bottoms size, set by the customer in their account';
comment on column public.customers.size_shoe is 'Preferred EU shoe size (38-47), set by the customer in their account';
