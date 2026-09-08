-- Founder decision 2026-09-08: product names & descriptions are English
-- ONLY across the whole platform (category names stay Arabic in the
-- Arabic-first portals). Mirror name_en into the NOT NULL name_ar column
-- so any legacy reader shows English, and clear Arabic descriptions.
update public.products
set name_ar = name_en,
    description_ar = null,
    meta_title_ar = null,
    meta_description_ar = null
where name_ar is distinct from name_en
   or description_ar is not null
   or meta_title_ar is not null
   or meta_description_ar is not null;
