-- Editorial imagery fields: collection covers (homepage "Collections"
-- section + shop collection header) and parent-category banners (shop).
alter table public.collections add column cover_url text;
alter table public.categories add column banner_url text;
