-- Collection covers get their own phone image (founder 2026-10-06: every
-- storefront image editable in MGMT, with a vertical phone version).
-- cover_url stays the desktop (wide) picture; cover_mobile_url is the portrait
-- one. Older covers named "…-wide.jpg" had their portrait twin next to them
-- without the suffix: record it so nothing changes on the site.
alter table public.collections add column if not exists cover_mobile_url text;

update public.collections
set cover_mobile_url = regexp_replace(cover_url, '-wide(\.\w+)$', '\1')
where cover_mobile_url is null and cover_url ~ '-wide\.\w+$';
