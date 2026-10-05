/**
 * Shared product-photo helpers for MGMT: the client-side WebP pipeline
 * (1600 / 800 / 400 renditions, same as the bulk import), the file-name
 * convention the storefront reads the view from, and the storefront's own
 * ordering and visibility rules so MGMT shows photos exactly as the site does.
 *
 * File names: `{CODE}/{view}[-n]-{stamp}-{width}.webp`, CODE = variant SKU base
 * with colour (BW-SWT-055-BLA), stamp = Date.now() (or v2 + 8 hex for older sets).
 */
import type { supabaseBrowser } from "@bach/supabase/browser";

type SupabaseClient = ReturnType<typeof supabaseBrowser>;

export const BUCKET = "product-media";
export const RENDITIONS = [1600, 800, 400] as const;

export interface MediaRow {
  id: string;
  product_id?: string;
  kind: string;
  storage_path: string;
  color_en?: string | null;
  sort: number | null;
}

/** The views the photo team shoots, in the order staff pick from. */
export const VIEWS = ["front", "back", "model-front", "model-back", "model-zoom", "detail"] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABEL: Record<string, string> = {
  front: "قدّام",
  back: "ضهر",
  "model-front": "لابس قدّام",
  "model-back": "لابس ضهر",
  "model-zoom": "عن قرب",
  detail: "تفصيل",
  model: "لابس",
};

/** Same order the bulk import uses for extra-photo sort numbers. */
export const VIEW_SORT: Record<string, number> = {
  front: 0,
  back: 1,
  "model-front": 2,
  model: 2,
  "model-back": 3,
  "model-zoom": 4,
  detail: 5,
};

export const SLOT_KINDS = ["front", "back", "side", "closeup"] as const;

const VIEW_RE = /\/(front|back|model-front|model-back|model-zoom|model|detail)(?:-(\d+))?-(?:\d+|v2[0-9a-f]+)-\d+\.webp$/;

/** What a photo shows — mirrors storefront lib/media.ts photoView(). */
export function photoView(m: { kind: string; storage_path: string }): { view: string; n: number; numbered: boolean } {
  const hit = VIEW_RE.exec(m.storage_path);
  return {
    view: hit?.[1] ?? ({ side: "model", closeup: "model-zoom" } as Record<string, string>)[m.kind] ?? m.kind,
    n: hit?.[2] ? Number(hit[2]) : 1,
    numbered: Boolean(hit?.[2]),
  };
}

/** Storefront gallery rank: worn close-up, worn front, worn back, more worn shots, product front/back, details. */
export function viewRank(m: { kind: string; storage_path: string }): number {
  const { view, numbered } = photoView(m);
  if (view === "model-zoom") return numbered ? 3 : 0;
  if (view === "model-front" || view === "model") return numbered ? 3 : 1;
  if (view === "model-back") return numbered ? 3 : 2;
  return ({ front: 4, back: 5, detail: 6 } as Record<string, number>)[view] ?? 7;
}

/** Extra photos (kind other) reach the site only inside this sort window. */
export const shownExtra = (sort: number | null | undefined) => sort != null && sort >= 100 && sort < 500;

/** On the site: the four slots always; extras only with a colour and a sort in the window. */
export const onSite = (m: MediaRow) => m.kind !== "other" || (!!m.color_en && shownExtra(m.sort));

/** Storefront order: slots then extras by sort, then stable by view rank. */
export function storefrontOrder<T extends MediaRow>(list: T[]): T[] {
  const slots = SLOT_KINDS.map((k) => list.find((m) => m.kind === k)).filter(Boolean) as T[];
  const extras = list.filter((m) => m.kind === "other").sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return [...slots, ...extras]
    .map((m, i) => ({ m, i }))
    .sort((a, b) => viewRank(a.m) - viewRank(b.m) || a.i - b.i)
    .map((x) => x.m);
}

/** Next sort that appends a photo to a colour's shown extras. */
export function nextShownSort(list: MediaRow[], color: string | null | undefined, skipId?: string): number {
  const used = list
    .filter((m) => m.id !== skipId && m.kind === "other" && (m.color_en ?? null) === (color ?? null) && shownExtra(m.sort))
    .map((m) => m.sort ?? 0);
  return Math.min(499, Math.max(109, ...used) + 1);
}

/** A hidden sort (500+) that keeps the photo's place if it is shown again. */
export const hiddenSort = (sort: number | null | undefined) => 500 + (Math.max(0, sort ?? 0) % 100);

/** Next free number for a view inside one colour (front, front-2, front-3 …). */
export function nextViewNumber(list: MediaRow[], color: string | null | undefined, view: string, skipId?: string): number {
  const taken = list
    .filter((m) => m.id !== skipId && (m.color_en ?? null) === (color ?? null) && photoView(m).view === view)
    .map((m) => photoView(m).n);
  let n = 1;
  while (taken.includes(n)) n += 1;
  return n;
}

export const viewTag = (view: string, n: number) => (n > 1 ? `${view}-${n}` : view);

/** BW-SWT-055-BLA-M → BW-SWT-055-BLA (the folder new photos of that colour go to). */
export function colourCode(sku: string | null | undefined): string | null {
  if (!sku) return null;
  const parts = sku.toUpperCase().split("-");
  if (parts.length >= 5) return parts.slice(0, 4).join("-");
  if (parts.length === 4) return parts.join("-");
  return null;
}

/** The small rendition for thumbnails (falls back to the URL itself). */
export const thumb = (url: string) => (url.endsWith("-1600.webp") ? url.replace(/-1600\.webp$/, "-400.webp") : url);

/** Object path inside the bucket for one of our public URLs, else null. */
export function objectPath(url: string): string | null {
  const m = /\/storage\/v1\/object\/public\/product-media\/(.+)$/.exec(url.split("?")[0] ?? "");
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

async function toWebp(bitmap: ImageBitmap, width: number): Promise<Blob> {
  const w = Math.min(width, bitmap.width);
  const h = Math.round((w / bitmap.width) * bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("webp encode failed"))), "image/webp", 0.82),
  );
}

/**
 * Converts an image to the three WebP renditions and uploads them as
 * `{dir}/{tag}-{Date.now()}-{w}.webp`. Returns the public URL of the 1600 file.
 * Timestamped names: the public CDN keeps serving a replaced file for a long time.
 */
export async function uploadRenditions(
  supabase: SupabaseClient,
  image: Blob,
  dir: string,
  tag: string,
): Promise<string> {
  const bitmap = await createImageBitmap(image);
  const stamp = Date.now();
  let mainUrl = "";
  try {
    for (const w of RENDITIONS) {
      const blob = await toWebp(bitmap, w);
      const path = `${dir}/${tag}-${stamp}-${w}.webp`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      if (w === RENDITIONS[0]) mainUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }
  } finally {
    bitmap.close();
  }
  return mainUrl;
}

/**
 * Gives an existing photo a new view in its file name (the storefront reads the
 * view from there). Copies the three renditions under the new name in the same
 * folder; old files stay (other rows or backups may point at them). A photo
 * whose small renditions are missing is re-encoded from the large one.
 */
export async function renameView(supabase: SupabaseClient, url: string, tag: string, fallbackDir: string): Promise<string> {
  const path = objectPath(url);
  const dir = path?.includes("/") ? path.slice(0, path.lastIndexOf("/")) : fallbackDir;
  if (path && path.endsWith("-1600.webp")) {
    const stem = path.slice(0, -"1600.webp".length);
    const stamp = Date.now();
    let ok = true;
    for (const w of RENDITIONS) {
      const { error } = await supabase.storage.from(BUCKET).copy(`${stem}${w}.webp`, `${dir}/${tag}-${stamp}-${w}.webp`);
      if (error) {
        ok = false;
        break;
      }
    }
    if (ok) return supabase.storage.from(BUCKET).getPublicUrl(`${dir}/${tag}-${stamp}-1600.webp`).data.publicUrl;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ما قدرنا نجيب الصورة (${res.status})`);
  return uploadRenditions(supabase, await res.blob(), dir, tag);
}

export const isImage = (f: File) => /^image\/(jpeg|png|webp)$/.test(f.type);
