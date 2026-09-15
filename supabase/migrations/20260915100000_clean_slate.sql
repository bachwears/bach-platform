-- CLEAN SLATE (founder request 2026-09-15, before the real stocktake import).
-- Wipes all TRANSACTIONAL and CATALOG data; keeps structure & configuration:
--   kept: branches, categories, collections, suppliers, customers, profiles,
--         newsletter_subscribers, exchange_rates, tva_settings, payment_methods,
--         promocodes, site_content, help_articles, hint_registry, size_guides,
--         season_windows, merchandising_settings, notification_templates
--   wiped: orders/invoices + payments + returns, parked sales, EOD closeouts,
--          inventory (levels/movements/stocktakes/alerts), purchase orders,
--          products + variants + media/seasons/collections links, wishlists,
--          campaigns & popups (test marketing data), notification log,
--          complaints, promocode redemptions, SKU sequences (numbering restarts)
-- A full data backup was taken right before this ran:
--   bach-platform/backups/pre-cleanup-2026-09-15.sql

begin;

-- returns & their money first (deepest children)
delete from public.order_return_payments;
delete from public.order_return_items;
delete from public.order_returns;
delete from public.return_requests;

-- sales / invoices / online orders
delete from public.order_payments;
delete from public.order_items;
delete from public.orders;
delete from public.parked_sales;
delete from public.eod_closeouts;
delete from public.promocode_redemptions;

-- support & notification history
delete from public.complaint_events;
delete from public.complaints;
delete from public.notification_log;

-- inventory & stocktakes
delete from public.stock_alerts;
delete from public.stocktake_counts;
delete from public.stocktakes;
delete from public.inventory_movements;
delete from public.inventory_levels;

-- purchasing history
delete from public.purchase_order_items;
delete from public.purchase_orders;

-- test marketing data (would silently discount the new catalog if kept)
delete from public.campaigns;
delete from public.popups;

-- catalog last (parents of most of the above)
delete from public.wishlists;
delete from public.product_collections;
delete from public.product_seasons;
delete from public.media_assets;
delete from public.product_variants;
delete from public.products;

-- SKU numbering restarts clean for the new stocktake import
delete from public.sku_sequences;

commit;
