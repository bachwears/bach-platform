"use client";

export interface CartLine {
  variantId: string;
  quantity: number;
}

const KEY = "bach-cart";
const EVENT = "bach-cart-changed";

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

export function addToCart(variantId: string, quantity = 1) {
  const lines = readCart();
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, 10);
  else lines.push({ variantId, quantity: Math.min(quantity, 10) });
  write(lines);
}

export function setQuantity(variantId: string, quantity: number) {
  const lines = readCart()
    .map((l) => (l.variantId === variantId ? { ...l, quantity } : l))
    .filter((l) => l.quantity > 0);
  write(lines);
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
