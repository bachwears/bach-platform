-- Category headers ship as two crops: banner_url (wide, desktop) and
-- banner_mobile_url (portrait 4:5, phones). Null = fall back to banner_url.
alter table public.categories add column if not exists banner_mobile_url text;
