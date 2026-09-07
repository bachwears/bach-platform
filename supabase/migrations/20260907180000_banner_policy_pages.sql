-- Editable promo banner + shipping/returns policy pages (site_content keys).

insert into public.site_content (key, value) values
(
  'home_banner',
  jsonb_build_object(
    'enabled', false,
    'text', 'Free delivery on orders over $100 — Lebanon-wide.',
    'cta_label', 'Shop now',
    'cta_href', '/shop'
  )
),
(
  'page_shipping',
  jsonb_build_object(
    'title', 'Delivery & Shipping',
    'body',
      'We deliver Lebanon-wide. Every order is confirmed by phone before dispatch, so nothing ships until we''ve spoken.' || E'\n\n' ||
      'Orders are prepared the same or next working day. Delivery typically takes 1–3 working days depending on your region.' || E'\n\n' ||
      'The courier fee is settled on arrival. You can pay cash on delivery in USD or LBP at the day''s rate, or by card online once card payment is live.' || E'\n\n' ||
      'You can follow every step of your order — from confirmation to delivery — in your account on bachwears.com.'
  )
),
(
  'page_returns',
  jsonb_build_object(
    'title', 'Returns & Exchanges',
    'body',
      'Delivered online orders can be returned or exchanged within 30 days.' || E'\n\n' ||
      'Pieces should be unworn, unwashed, and with their original tags attached.' || E'\n\n' ||
      'Start a return from your account or from the Start a return page — pick the order, tell us which pieces, and we''ll take it from there.' || E'\n\n' ||
      'Exchanges for a different size or color follow the same steps. Refunds are settled the way you paid.'
  )
)
on conflict (key) do nothing;
