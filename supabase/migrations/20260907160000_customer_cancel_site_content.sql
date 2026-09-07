-- Customer self-service cancellation + MGMT-editable storefront content.

-- ── site_content: key/value JSON blocks the storefront renders ──────────────
create table public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.site_content enable row level security;

create policy site_content_read on public.site_content
  for select using (true);

create policy site_content_write on public.site_content
  for all
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- Seed with the copy that ships hardcoded today, so the editor starts full.
insert into public.site_content (key, value) values (
  'home_hero',
  jsonb_build_object(
    'eyebrow', 'Menswear · Lebanon',
    'headline', 'Dress with intent.',
    'sub', 'Considered menswear, built to last beyond the season.',
    'cta_label', 'Shop the collection',
    'cta_href', '/shop',
    'image_url', '',
    'image_alt', 'Two men in considered BACH Wears tailoring against a stone facade'
  )
) on conflict (key) do nothing;

-- ── customer_cancel_order: the customer's own cancel window ─────────────────
-- Same reservation-release semantics as the staff RPC, but scoped to the
-- caller's own online orders and only before the order is packed.
create or replace function public.customer_cancel_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
begin
  select o.* into v_order
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.id = p_order_id
    and o.channel = 'online'
    and c.auth_user_id = auth.uid()
  for update of o;

  if v_order is null then
    raise exception 'order not found';
  end if;
  if v_order.status not in ('pending', 'confirmed', 'picking') then
    raise exception 'order can no longer be cancelled';
  end if;

  update public.inventory_levels il
  set reserved = greatest(il.reserved - oi.quantity, 0), updated_at = now()
  from public.order_items oi
  where oi.order_id = p_order_id
    and il.variant_id = oi.variant_id
    and il.branch_id = v_order.branch_id;

  update public.orders set status = 'cancelled', updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.customer_cancel_order(uuid) from public;
grant execute on function public.customer_cancel_order(uuid) to authenticated;
