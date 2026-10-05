/**
 * Fit Finder rules — a guide, not a guarantee.
 *
 * Tops: estimate the chest from height and weight, then read it against the
 * size guide's "Chest" column. Bottoms: same with the waist. When the product's
 * guide doesn't list its sizes (bottoms are lettered, the pants guide is in
 * waist numbers), the BACH letter tables below are used instead. Shoes can't be
 * guessed from height and weight, so the shopper gives their usual EU size.
 *
 *   BMI    = kg / m²
 *   chest ≈ 50 + 2.1 × BMI + 0.15 × (height − 178)   (cm, adult men)
 *   waist ≈ 15 + 3.0 × BMI                            (cm)
 *
 * Preferred fit nudges the estimate before matching: closer −2 cm, relaxed +3 cm.
 * Between two sizes we go up, unless the shopper asked for a closer fit.
 */

import type { SizeGuideData } from "../components/size-guide";
import { sizeRank } from "./sizes";

export type FitPref = "closer" | "regular" | "relaxed";
export type FitKind = "top" | "bottom" | "shoe";
export const FIT_PREFS: FitPref[] = ["closer", "regular", "relaxed"];

// Category codes, matched against the product's category and every one above it.
const BOTTOMS = new Set(["BTMS", "PNT", "JNS", "JOG", "SHR", "TR"]);
const SHOES = new Set(["SHO", "BOT"]);
const ONE_SIZE = new Set(["ACC", "SCF", "HAT", "MSC"]);

// BACH letter tables (cm) — S–XXL as in the tops guide, XS / 3XL extended by one step.
const LETTER_CHEST: Array<[string, number, number]> = [
  ["XS", 82, 87],
  ["S", 88, 94],
  ["M", 95, 101],
  ["L", 102, 108],
  ["XL", 109, 116],
  ["XXL", 117, 124],
  ["3XL", 125, 132],
];
const LETTER_WAIST: Array<[string, number, number]> = [
  ["XS", 70, 75],
  ["S", 76, 82],
  ["M", 83, 89],
  ["L", 90, 97],
  ["XL", 98, 106],
  ["XXL", 107, 115],
  ["3XL", 116, 124],
];

const NUDGE: Record<FitPref, number> = { closer: -2, regular: 0, relaxed: 3 };

/** Which question set a product needs; null for one-size pieces (no Fit Finder). */
export function fitKind(categoryCodes: string[], sizes: string[]): FitKind | null {
  if (sizes.length < 2 || categoryCodes.some((c) => ONE_SIZE.has(c))) return null;
  if (categoryCodes.some((c) => SHOES.has(c)) || sizes.every((s) => /^\d{2}$/.test(s) && Number(s) >= 35 && Number(s) <= 50)) {
    return "shoe";
  }
  return categoryCodes.some((c) => BOTTOMS.has(c)) ? "bottom" : "top";
}

/** The customer-profile column a recommendation is saved into. */
export const FIT_SLOT: Record<FitKind, "size_top" | "size_bottom" | "size_shoe"> = {
  top: "size_top",
  bottom: "size_bottom",
  shoe: "size_shoe",
};

/** Only values the customers table accepts are saved as the profile size. */
export function savableSize(kind: FitKind, size: string): boolean {
  return kind === "shoe" ? /^(3[89]|4[0-7])$/.test(size) : ["XS", "S", "M", "L", "XL", "XXL"].includes(size.toUpperCase());
}

export interface FitResult {
  size: string;
  /** what the size was matched on, for the one-line reason */
  measure?: "chest" | "waist";
  estimateCm?: number;
  /** the guide's ends or the product's run moved the pick */
  edge?: "smallest" | "largest" | "nearest";
}

/** "88–94", "88-94" or "43" → [lo, hi]; anything else → null. */
function range(cell: string): [number, number] | null {
  const nums = (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return null;
  return [nums[0]!, nums[nums.length - 1]!];
}

/** The guide's rows for one measurement, when the guide covers this product's sizes. */
function guideTable(guide: SizeGuideData | null, measure: "chest" | "waist", sizes: string[]) {
  if (!guide) return null;
  const col = guide.headers.findIndex((h) => new RegExp(measure, "i").test(h));
  if (col <= 0) return null;
  const table: Array<[string, number, number]> = [];
  for (const row of guide.rows) {
    const r = range(row[col] ?? "");
    if (row[0] && r) table.push([row[0], r[0], r[1]]);
  }
  const own = new Set(sizes.map((s) => s.toUpperCase()));
  return table.length && table.some(([label]) => own.has(label.toUpperCase())) ? table : null;
}

/** Pick the size whose range holds the estimate; between ranges go up unless "closer". */
function match(table: Array<[string, number, number]>, cm: number, fit: FitPref): FitResult {
  const first = table[0]!;
  const last = table[table.length - 1]!;
  if (cm < first[1]) return { size: first[0], edge: "smallest" };
  if (cm >= last[2] + 1) return { size: last[0], edge: "largest" };
  for (let i = 0; i < table.length; i++) {
    const [label, lo, hi] = table[i]!;
    if (cm >= lo && cm < hi + 1) return { size: label };
    const next = table[i + 1];
    if (next && cm >= hi + 1 && cm < next[1]) return { size: fit === "closer" ? label : next[0] };
  }
  return { size: last[0] };
}

/** Keep the pick inside the sizes this product is actually made in. */
function withinRun(result: FitResult, sizes: string[]): FitResult {
  const hit = sizes.find((s) => s.toUpperCase() === result.size.toUpperCase());
  if (hit) return { ...result, size: hit };
  const want = sizeRank(result.size);
  const nearest = [...sizes].sort((a, b) => Math.abs(sizeRank(a) - want) - Math.abs(sizeRank(b) - want) || sizeRank(b) - sizeRank(a))[0];
  return nearest ? { ...result, size: nearest, edge: "nearest" } : result;
}

export function recommend(
  kind: FitKind,
  input: { heightCm: number; weightKg: number; fit: FitPref; shoe?: string },
  sizes: string[],
  guide: SizeGuideData | null,
): FitResult {
  if (kind === "shoe") return withinRun({ size: input.shoe ?? "" }, sizes);
  const bmi = input.weightKg / (input.heightCm / 100) ** 2;
  const measure = kind === "bottom" ? "waist" : "chest";
  const body = measure === "chest" ? 50 + 2.1 * bmi + 0.15 * (input.heightCm - 178) : 15 + 3 * bmi;
  const cm = body + NUDGE[input.fit];
  const table = guideTable(guide, measure, sizes) ?? (measure === "chest" ? LETTER_CHEST : LETTER_WAIST);
  return { ...withinRun(match(table, cm, input.fit), sizes), measure, estimateCm: Math.round(body) };
}
