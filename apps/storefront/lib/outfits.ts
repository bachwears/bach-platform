import { unstable_cache } from "next/cache";
import { supabasePublic } from "@bach/supabase/public";
import { outfitPrice, type OutfitPriceKind } from "@bach/ui/lib/outfit-price";

/**
 * Outfits on the storefront: every published look with its pieces, read once
 * and cached (tag "catalog"). The menu, the shop cards, the "Wear the full
 * look" rows, /outfits and each look's page all read from here.
 */

type Level = { quantity: number; reserved: number };
export interface OutfitVariant {
  id: string;
  size: string;
  color_en: string;
  color_ar: string | null;
  color_code: string;
  is_active: boolean;
  inventory_levels: Level[] | null;
}
export interface OutfitProduct {
  id: string;
  slug: string;
  name_en: string;
  status: string;
  fit: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  media_assets: Array<{ kind: string; storage_path: string; color_en: string | null; sort: number | null }> | null;
  product_variants: OutfitVariant[] | null;
}
export interface OutfitPiece {
  product_id: string;
  default_color_code: string | null;
  sort: number;
  products: OutfitProduct | null;
}
export interface Outfit {
  id: string;
  slug: string;
  name_en: string;
  description_en: string | null;
  price_kind: OutfitPriceKind;
  percent_off: number | null;
  fixed_usd_cents: number | null;
  promo_mode: "exclude" | "stack" | "best";
  sell_mode: "flexible" | "whole" | "exclusive";
  barcode: string | null;
  meta_title_en: string | null;
  meta_description_en: string | null;
  sort: number;
  created_at: string;
  outfit_media: Array<{ storage_path: string; is_main: boolean; sort: number; alt_en: string | null }> | null;
  outfit_items: OutfitPiece[] | null;
}

const SELECT =
  "id, slug, name_en, description_en, price_kind, percent_off, fixed_usd_cents, promo_mode, sell_mode, barcode, meta_title_en, meta_description_en, sort, created_at, " +
  "outfit_media(storage_path, is_main, sort, alt_en), " +
  "outfit_items(product_id, default_color_code, sort, products(id, slug, name_en, status, fit, price_usd_cents, sale_price_usd_cents, " +
  "media_assets(kind, storage_path, color_en, sort), product_variants(id, size, color_en, color_ar, color_code, is_active, inventory_levels(quantity, reserved))))";

export const getOutfitCatalog = unstable_cache(
  async (): Promise<Outfit[]> => {
    const { data } = await supabasePublic()
      .from("outfits")
      .select(SELECT)
      .eq("status", "published")
      .order("sort")
      .order("created_at", { ascending: false });
    return ((data ?? []) as unknown as Outfit[]).map((o) => ({
      ...o,
      outfit_items: [...(o.outfit_items ?? [])].sort((a, b) => a.sort - b.sort),
      outfit_media: [...(o.outfit_media ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort - b.sort),
    }));
  },
  ["outfit-catalog-v1"],
  { revalidate: 60, tags: ["catalog"] },
);

export async function getOutfit(slug: string): Promise<Outfit | null> {
  return (await getOutfitCatalog()).find((o) => o.slug === slug) ?? null;
}

const sellableUnits = (v: OutfitVariant) =>
  v.is_active ? (v.inventory_levels ?? []).reduce((n, l) => n + l.quantity - l.reserved, 0) : 0;

/** Units of a piece that can be bought (every colour and size). */
export const pieceStock = (p: OutfitProduct | null) => (p?.product_variants ?? []).reduce((n, v) => n + Math.max(sellableUnits(v), 0), 0);

/** Units of one variant that can be bought. */
export const variantStock = (v: OutfitVariant) => Math.max(sellableUnits(v), 0);

/** A piece that can be shown and bought: published, photographed, in stock. */
export const pieceAvailable = (p: OutfitProduct | null) =>
  !!p && p.status === "published" && (p.media_assets ?? []).some((m) => m.kind === "front") && pieceStock(p) > 0;

/** Listed (menu, shop, rows, /outfits): a photo of the look, and every piece available. */
export const isListable = (o: Outfit) =>
  (o.outfit_items ?? []).length >= 2 && (o.outfit_media ?? []).length > 0 && (o.outfit_items ?? []).every((i) => pieceAvailable(i.products));

/** Pieces of published "exclusive" looks: never shown as standalone products. */
export const exclusivePieces = (catalog: Outfit[]): Map<string, Outfit> => {
  const out = new Map<string, Outfit>();
  for (const o of catalog) if (o.sell_mode === "exclusive") for (const i of o.outfit_items ?? []) out.set(i.product_id, o);
  return out;
};

const current = (p: OutfitProduct) => Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);

/** The complete look's price (what price_cart charges for every piece once). */
export function lookPrice(o: Outfit) {
  const pieces = (o.outfit_items ?? []).filter((i) => i.products).map((i) => ({ current: current(i.products!), full: i.products!.price_usd_cents }));
  return outfitPrice(pieces, o.price_kind, o.percent_off, o.fixed_usd_cents);
}

export const lookPhoto = (o: Outfit) => o.outfit_media?.[0]?.storage_path ?? null;
