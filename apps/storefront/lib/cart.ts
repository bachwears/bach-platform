"use client";

/**
 * The bag, kept in the browser. A line is a piece (variant) and a quantity; a
 * piece added as part of a look also carries the look (outfitId + outfitGroup,
 * one group per look added), so checkout can price the look on the server. The
 * same piece can sit loose and inside a look as two lines.
 */
export interface CartLine {
  variantId: string;
  quantity: number;
  outfitId?: string;
  /** one id per look added to the bag (the same look twice = two groups) */
  outfitGroup?: string;
  outfitName?: string;
  outfitSlug?: string;
  /** flexible · whole · exclusive — whole/exclusive looks leave the bag as one */
  outfitMode?: "flexible" | "whole" | "exclusive";
}

const KEY = "bach-cart";
const EVENT = "bach-cart-changed";

/** A line's identity: the piece, and the look it belongs to (if any). */
export const lineKey = (l: Pick<CartLine, "variantId" | "outfitGroup">) => `${l.variantId}|${l.outfitGroup ?? ""}`;

export function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l.variantId && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable — cart lives for the page only */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** A loose piece (merged with the same loose piece already in the bag). */
export function addToCart(variantId: string, quantity = 1) {
  const lines = readCart();
  const existing = lines.find((l) => l.variantId === variantId && !l.outfitGroup);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, 10);
  else lines.push({ variantId, quantity: Math.min(quantity, 10) });
  write(lines);
}

/** The pieces of a look, one each, as a new group. Returns the group id. */
export function addOutfitToCart(look: {
  outfitId: string;
  name: string;
  slug: string;
  mode: "flexible" | "whole" | "exclusive";
  variantIds: string[];
}): string {
  const group = `${look.outfitId.slice(0, 8)}-${Date.now().toString(36)}`;
  const lines = readCart();
  for (const variantId of look.variantIds) {
    lines.push({
      variantId,
      quantity: 1,
      outfitId: look.outfitId,
      outfitGroup: group,
      outfitName: look.name,
      outfitSlug: look.slug,
      outfitMode: look.mode,
    });
  }
  write(lines);
  return group;
}

/**
 * Change a line's quantity (0 removes it). A look's pieces stay at one each;
 * removing a piece of a "whole" or "exclusive" look removes the whole look.
 */
export function setQuantity(variantId: string, quantity: number, outfitGroup?: string) {
  let lines = readCart();
  const target = lines.find((l) => l.variantId === variantId && (l.outfitGroup ?? "") === (outfitGroup ?? ""));
  if (!target) return;
  if (target.outfitGroup) {
    if (quantity > 0) return; // a look's piece is one; add the look again for two
    if (target.outfitMode === "whole" || target.outfitMode === "exclusive") {
      lines = lines.filter((l) => l.outfitGroup !== target.outfitGroup);
    } else {
      lines = lines.filter((l) => l !== target);
    }
  } else {
    lines = lines.map((l) => (l === target ? { ...l, quantity } : l)).filter((l) => l.quantity > 0);
  }
  write(lines);
}

/** Take a whole look out of the bag. */
export function removeOutfit(outfitGroup: string) {
  write(readCart().filter((l) => l.outfitGroup !== outfitGroup));
}

export function clearCart() {
  write([]);
}

export function cartCount(): number {
  return readCart().reduce((s, l) => s + l.quantity, 0);
}

export function onCartChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
