/**
 * Product photos are uploaded as {name}-1600.webp with -800 and -400 siblings.
 * For those, return a srcSet so phones fetch the smaller file; other URLs pass through.
 */
export function photoSrc(url: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!url.endsWith("-1600.webp")) return { src: url };
  const base = url.slice(0, -"1600.webp".length);
  return { src: url, srcSet: `${base}400.webp 400w, ${base}800.webp 800w, ${url} 1600w`, sizes };
}

export interface CardMedia {
  kind: string;
  storage_path: string;
  color_en?: string | null;
  sort?: number | null;
}

/**
 * Hover photo for a product card: the back shot; without one, a random pick from
 * the other photos the site shows (the front photo's colour first).
 */
export function hoverPhoto(media: CardMedia[]): string | null {
  const back = media.find((m) => m.kind === "back");
  if (back) return back.storage_path;
  const front = media.find((m) => m.kind === "front");
  // extra photos are on the site only inside the 100..499 sort window (MGMT hides the rest)
  const shown = media.filter(
    (m) => m !== front && (m.kind !== "other" || (m.sort != null && m.sort >= 100 && m.sort < 500)),
  );
  const same = shown.filter((m) => front?.color_en && m.color_en === front.color_en);
  const pool = same.length ? same : shown;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)]!.storage_path : null;
}

/** The photo of a given colour for bag and order lines: that colour's front, any shown photo of it, else the main photo. */
export function colourPhoto(media: CardMedia[], colorEn: string | null | undefined): string | null {
  const onSite = (m: CardMedia) => m.kind !== "other" || (m.sort != null && m.sort >= 100 && m.sort < 500);
  return (
    (colorEn
      ? media.find((m) => m.kind === "front" && m.color_en === colorEn) ??
        media.find((m) => m.color_en === colorEn && onSite(m))
      : undefined) ??
    media.find((m) => m.kind === "front") ??
    null
  )?.storage_path ?? null;
}
