-- Scannable barcodes for every variant (founder report 2026-10-13: labels of
-- products added from MGMT don't scan at the POS).
--
-- Cause: the SKU trigger set barcode = sku for every variant added after the
-- stock-count import, so labels printed a ~22-character code ("BW-CAP-0010-
-- ONESIZEBLA") as Code 128 — bars too thin for a small label — and a scanner
-- typing letters on an Arabic keyboard layout sends Arabic letters, so even a
-- good read doesn't match. The stock-count import used 13-digit in-store
-- EAN-13 numbers (2000000000015…), which have neither problem.
--
-- 1. next_internal_ean(): the next number in that same in-store range
--    ("2" + 11 digits + EAN-13 check digit), after the highest one in use.
-- 2. generate_variant_sku(): a new variant gets such a barcode; its SKU reuses
--    the product's model number when the product already has variants (one
--    model = one number, as in the import: BW-SWT-005-BRO-S), else takes the
--    category's next number; colour and size follow, "One Size" → OS.
-- 3. Backfill: every variant whose barcode isn't a 13-digit number gets one.
--    SKUs stay as they are, and the POS still finds a scanned SKU, so labels
--    already printed keep working where they scan; reprint for the new number.

create sequence if not exists public.internal_ean_seq;

-- start after the highest in-store number already in use
select setval(
  'public.internal_ean_seq',
  greatest(
    coalesce((select max(substr(barcode, 2, 11)::bigint) from public.product_variants where barcode ~ '^2\d{12}$'), 0),
    1
  )
);

create or replace function public.next_internal_ean()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  body text;
  s int := 0;
  i int;
begin
  loop
    body := '2' || lpad(nextval('public.internal_ean_seq')::text, 11, '0');
    s := 0;
    for i in 1..12 loop
      s := s + substr(body, i, 1)::int * (case when i % 2 = 0 then 3 else 1 end);
    end loop;
    body := body || ((10 - s % 10) % 10)::text;
    -- a hand-typed duplicate can't block the trigger
    exit when not exists (select 1 from public.product_variants where barcode = body);
  end loop;
  return body;
end;
$$;

create or replace function public.generate_variant_sku()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cat_code text;
  model text;
  size_part text;
begin
  if new.sku is null then
    -- one model number per product: reuse a sibling's
    select array_to_string((string_to_array(v.sku, '-'))[1:3], '-') into model
    from public.product_variants v
    where v.product_id = new.product_id and v.sku ~ '^BW-[A-Z]+-\d+'
    order by v.created_at
    limit 1;

    if model is null then
      select c.code into cat_code
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = new.product_id;
      model := 'BW-' || cat_code || '-' || lpad(public.next_sku_seq(cat_code)::text, 3, '0');
    end if;

    size_part := upper(regexp_replace(coalesce(new.size, ''), '\s', '', 'g'));
    if size_part in ('ONESIZE', 'OS', '') then
      size_part := 'OS';
    end if;
    new.sku := model || '-' || coalesce(new.color_code, 'NA') || '-' || size_part;

    -- never collide with an older SKU (e.g. a retired variant)
    while exists (select 1 from public.product_variants where sku = new.sku) loop
      new.sku := new.sku || 'X';
    end loop;
  end if;

  -- a factory barcode typed in stays; otherwise an in-store number
  if new.barcode is null or btrim(new.barcode) = '' or new.barcode = new.sku then
    new.barcode := public.next_internal_ean();
  end if;

  return new;
end;
$$;

-- backfill: a real scannable number for every variant that only had its SKU
update public.product_variants
set barcode = public.next_internal_ean()
where barcode is null or btrim(barcode) = '' or barcode = sku;
