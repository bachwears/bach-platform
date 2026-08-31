-- Product media bucket: public read, catalog-manager write (§4 image pipeline).

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "public read product media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-media');

create policy "catalog managers upload product media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager')
  );

create policy "catalog managers update product media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-media'
    and public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager')
  );

create policy "catalog managers delete product media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-media'
    and public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager')
  );
