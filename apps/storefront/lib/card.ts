import type { CardProduct } from "../components/product-card";
import { hoverPhoto, type CardMedia } from "./media";
import { sizeRank, sizeRun } from "./sizes";

export { sizeRank };

/** Most photos a card carries per colour — enough to swipe, light enough for long grids. */
const MAX_PHOTOS = 5;


// extra photos are on the site only inside the 100..499 sort window (MGMT hides the rest)
const onSite = (m: CardMedia) => m.kind !== "other" || (m.sort != null && m.sort >= 100 && m.sort < 500);

// Card order: the product shot first (listings stay calm and consistent), then back,
// worn shots, close-ups, details. Slot kinds say the view; extras carry it in the file name.
const cardRank = (m: CardMedia) => {
  const hit = /\/(front|back|model-zoom|model|detail)(-\d+)?-(?:\d+|v2[0-9a-f]+)-\d+\.webp$/.exec(m.storage_path);
  const view = hit?.[1] ?? ({ side: "model", closeup: "model-zoom" } as Record<string, string>)[m.kind] ?? m.kind;
  if (view === "model") return hit?.[2] ? 3 : 2;
  return ({ front: 0, back: 1, "model-zoom": 4, detail: 5 } as Record<string, number>)[view] ?? 6;
};
const ordered = (list: CardMedia[]) =>
  list
    .map((m, i) => ({ m, i }))
    .sort((a, b) => cardRank(a.m) - cardRank(b.m) || (a.m.sort ?? 0) - (b.m.sort ?? 0) || a.i - b.i)
    .map((x) => x.m.storage_path)
    .slice(0, MAX_PHOTOS);

export interface CardRow {
  slug: string;
  name_en: string;
  name_ar?: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  fit?: string | null;
  media_assets: CardMedia[] | null;
  product_variants: Array<{
    id?: string;
    size?: string;
    color_en: string;
    color_code?: string | null;
    is_active: boolean;
    inventory_levels?: Array<{ quantity: number; reserved: number }> | null;
  }> | null;
}

/** Columns a card needs from `products` (embed-ready). */
export const CARD_COLUMNS =
  "slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, fit, media_assets(kind, storage_path, color_en, sort), product_variants(id, size, color_en, color_code, is_active, inventory_levels(quantity, reserved))";

/**
 * A listing card from a product row: the photographed colour's photos to swipe,
 * every other colour's own photos for the swatches, and the variants for quick add.
 */
export function toCardProduct(p: CardRow): CardProduct {
  const media = p.media_assets ?? [];
  const front = media.find((m) => m.kind === "front") ?? null;
  const heroColor = front?.color_en ?? null;
  const extras = media.filter((m) => m.kind === "other" && m.color_en && onSite(m));

  const photos: Record<string, string[]> = {
    "": ordered([
      ...media.filter((m) => ["front", "back", "side", "closeup"].includes(m.kind)),
      ...extras.filter((m) => m.color_en === heroColor),
    ]),
  };
  for (const c of new Set(extras.map((m) => m.color_en!))) {
    if (c !== heroColor) photos[c] = ordered(extras.filter((m) => m.color_en === c));
  }

  const active = (p.product_variants ?? []).filter((v) => v.is_active);
  const variants = active
    .filter((v) => v.id && v.size)
    .sort((a, b) => sizeRank(a.size!) - sizeRank(b.size!))
    .map((v) => ({
      variantId: v.id!,
      size: v.size!,
      color: v.color_en,
      colorCode: v.color_code ?? null,
      // same sum the product page uses; rows without stock data stay buyable
      soldOut: v.inventory_levels ? v.inventory_levels.reduce((n, l) => n + l.quantity - l.reserved, 0) <= 0 : false,
    }));
  const seen = new Set<string>();

  return {
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar ?? null,
    price_usd_cents: p.price_usd_cents,
    sale_price_usd_cents: p.sale_price_usd_cents,
    front: front?.storage_path ?? null,
    back: hoverPhoto(media),
    colors: active.map((v) => v.color_en),
    sizes: variants.filter((v) => !seen.has(v.size) && seen.add(v.size)).map(({ variantId, size, soldOut }) => ({ variantId, size, soldOut })),
    photos,
    heroColor,
    variants,
    sizeRun: sizeRun(variants.map((v) => v.size), p.fit),
  };
}
