/**
 * The complete look's price, as the database prices it (price_cart): the lower
 * of the pieces' current sum and the look's own price on their full prices.
 * Used for the MGMT preview only — checkouts always price on the server.
 */
export type OutfitPriceKind = "sum" | "percent" | "fixed";

export interface OutfitPricePiece {
  /** current price in cents (sale price when lower) */
  current: number;
  /** full price in cents */
  full: number;
}

export function outfitPrice(
  pieces: OutfitPricePiece[],
  kind: OutfitPriceKind,
  percent: number | null,
  fixedCents: number | null,
): { sum: number; full: number; pay: number; saving: number; percentSaving: number } {
  const sum = pieces.reduce((n, p) => n + p.current, 0);
  const full = pieces.reduce((n, p) => n + p.full, 0);
  const target =
    kind === "percent" && percent
      ? Math.round((full * (100 - percent)) / 100)
      : kind === "fixed" && fixedCents
        ? fixedCents
        : sum;
  const pay = Math.min(sum, target);
  const saving = Math.max(sum - pay, 0);
  return { sum, full, pay, saving, percentSaving: sum ? Math.round((saving / sum) * 100) : 0 };
}

export interface OutfitHealthPiece {
  name: string;
  status: string;
  hasFront: boolean;
  /** sellable units over all variants */
  stock: number;
}

/** What stops the look from selling, in staff Arabic. Empty = sellable. */
export function outfitHealth(pieces: OutfitHealthPiece[]): string[] {
  const out: string[] = [];
  if (pieces.length < 2) out.push("لازم قطعتين عالأقل");
  for (const p of pieces) {
    if (p.status === "archived") out.push(`«${p.name}» مؤرشفة`);
    else if (p.status !== "published") out.push(`«${p.name}» مسودة — مخفية عن الموقع`);
    if (p.stock <= 0) out.push(`«${p.name}» خالصة`);
    if (!p.hasFront) out.push(`«${p.name}» بلا صورة`);
  }
  return out;
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/** A link-safe slug from an English name. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
