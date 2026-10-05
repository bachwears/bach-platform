import type { supabaseBrowser } from "@bach/supabase/browser";

type SupabaseClient = ReturnType<typeof supabaseBrowser>;

/**
 * Small product photos for staff screens (POS, MGMT): a 400px rendition of the
 * piece's front photo in the right colour, so a cashier can tell pieces apart
 * at a glance. Photos are stored as full public URLs ending in -1600.webp.
 */
export function thumbUrl(url: string | null | undefined, width: 400 | 800 = 400): string | null {
  if (!url) return null;
  return url.replace(/-1600\.webp$/, `-${width}.webp`);
}

export type PhotoMap = Map<string, string>;

const key = (productId: string, color?: string | null) => `${productId}|${(color ?? "").trim().toLowerCase()}`;

/**
 * Every product's front photo per colour (`front-…` files), plus its main photo.
 * Paged: there are more photos than one API response holds. Hidden photos
 * (sort ≥ 500) are only used when nothing visible exists.
 */
export async function loadFrontPhotos(supabase: SupabaseClient): Promise<PhotoMap> {
  const rows: Array<{ product_id: string; kind: string; storage_path: string; color_en: string | null; sort: number }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("media_assets")
      .select("product_id, kind, storage_path, color_en, sort")
      .like("storage_path", "%/front-%")
      .order("id")
      .range(from, from + 999);
    if (error || !data) break;
    rows.push(...(data as typeof rows));
    if (data.length < 1000) break;
  }
  // best first: visible before hidden, the main photo before extras, lowest sort
  rows.sort((a, b) => Number(a.sort >= 500) - Number(b.sort >= 500) || Number(a.kind !== "front") - Number(b.kind !== "front") || a.sort - b.sort);
  const map: PhotoMap = new Map();
  for (const r of rows) {
    const url = thumbUrl(r.storage_path)!;
    if (r.color_en && !map.has(key(r.product_id, r.color_en))) map.set(key(r.product_id, r.color_en), url);
    if (r.kind === "front" && !map.has(key(r.product_id))) map.set(key(r.product_id), url);
  }
  // products whose only front photos are colour extras still get a fallback
  for (const r of rows) if (!map.has(key(r.product_id))) map.set(key(r.product_id), thumbUrl(r.storage_path)!);
  return map;
}

/** The piece's photo in its colour, else the product's main photo. */
export function photoFor(map: PhotoMap | null | undefined, productId: string | null | undefined, color?: string | null): string | null {
  if (!map || !productId) return null;
  return map.get(key(productId, color)) ?? map.get(key(productId)) ?? null;
}
