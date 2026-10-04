/**
 * The sizes BACH usually carries. A sized piece always lists its full run so a
 * missing size reads as "not available" (crossed out) instead of silently absent.
 * Oversized and one-size pieces (hats, scarves…) only list what they really come in.
 */
const LETTER_RUN = ["S", "M", "L", "XL", "XXL"];
const SHOE_RUN = ["40", "41", "42", "43", "44"];
const LETTERS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export const sizeRank = (s: string) => {
  const i = LETTERS.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isFinite(n) ? 100 + n : 999;
};

/** The full size list for a piece: its own sizes plus the usual run, in size order. */
export function sizeRun(own: string[], fit?: string | null): string[] {
  const sizes = [...new Set(own)];
  const noRun = /one size|oversiz/i.test(fit ?? "");
  let run: string[] = [];
  if (!noRun && sizes.length) {
    if (sizes.every((s) => LETTERS.includes(s.toUpperCase()))) run = LETTER_RUN;
    else if (sizes.every((s) => /^\d{2}$/.test(s) && Number(s) >= 35 && Number(s) <= 50)) run = SHOE_RUN;
  }
  return [...new Set([...sizes, ...run.filter((r) => !sizes.some((s) => s.toUpperCase() === r))])].sort(
    (a, b) => sizeRank(a) - sizeRank(b),
  );
}

/** Buyable sizes first, then the crossed-out ones — each group in size order. */
export function availableFirst<T extends { size: string }>(list: T[], out: (t: T) => boolean): T[] {
  return [...list].sort((a, b) => Number(out(a)) - Number(out(b)) || sizeRank(a.size) - sizeRank(b.size));
}
