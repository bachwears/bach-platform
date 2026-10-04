/**
 * Product photos are uploaded as {name}-1600.webp with -800 and -400 siblings.
 * For those, return a srcSet so phones fetch the smaller file; other URLs pass through.
 */
export function photoSrc(url: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!url.endsWith("-1600.webp")) return { src: url };
  const base = url.slice(0, -"1600.webp".length);
  return { src: url, srcSet: `${base}400.webp 400w, ${base}800.webp 800w, ${url} 1600w`, sizes };
}

/**
 * What a photo shows, from its storage file name (`{CODE}/{view}[-n]-{stamp}-{w}.webp`)
 * or, for older slot rows, its kind. Views: front / back = product only;
 * model-front / model-back = worn, facing / turned away; model = worn (older,
 * direction unknown); model-zoom = worn close-up; detail.
 */
export function photoView(m: { kind: string; storage_path?: string; url?: string }): { view: string; numbered: boolean } {
  const hit = /\/(front|back|model-front|model-back|model-zoom|model|detail)(-\d+)?-(?:\d+|v2[0-9a-f]+)-\d+\.webp$/.exec(
    m.storage_path ?? m.url ?? "",
  );
  return {
    view: hit?.[1] ?? ({ side: "model", closeup: "model-zoom" } as Record<string, string>)[m.kind] ?? m.kind,
    numbered: Boolean(hit?.[2]),
  };
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

// Which shot best stands for a piece in a small thumbnail: the product front,
// then a worn shot, then the back — never a close-up or detail if avoidable.
const thumbRank = (m: CardMedia) => {
  const { view } = photoView(m);
  return ({ front: 0, "model-front": 1, model: 1, back: 2, "model-back": 3, "model-zoom": 4 } as Record<string, number>)[view] ?? 5;
};

/** The photo of a given colour for bag and order lines: that colour's best shot, else the main photo. */
export function colourPhoto(media: CardMedia[], colorEn: string | null | undefined): string | null {
  const onSite = (m: CardMedia) => m.kind !== "other" || (m.sort != null && m.sort >= 100 && m.sort < 500);
  const best = (list: CardMedia[]) =>
    [...list].sort((a, b) => thumbRank(a) - thumbRank(b) || (a.sort ?? 0) - (b.sort ?? 0))[0];
  return (
    (colorEn
      ? media.find((m) => m.kind === "front" && m.color_en === colorEn) ??
        best(media.filter((m) => m.color_en === colorEn && onSite(m)))
      : undefined) ??
    media.find((m) => m.kind === "front") ??
    null
  )?.storage_path ?? null;
}
