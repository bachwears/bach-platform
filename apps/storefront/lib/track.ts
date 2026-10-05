"use client";

/**
 * First-party, cookie-free analytics (results in MGMT → التحليلات). Sends only an
 * event name, the page path, a product id/slug, where the click came from and an
 * amount — never personal data, and nothing is stored on the device: the server
 * counts visitors with a daily-rotating hash (app/api/e/route.ts). Visitors with
 * Do Not Track or Global Privacy Control on send nothing.
 */
export type TrackEvent =
  | "page_view"
  | "product_view"
  | "add_to_bag"
  | "rec_click"
  | "bag_view"
  | "checkout_start"
  | "order_placed"
  | "delivery_bar_seen"
  | "search";

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  return nav.doNotTrack === "1" || win.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

// Account pages carry order numbers and the like in their URLs: report them as one path.
function currentPath(): string {
  const p = window.location.pathname;
  return (p === "/account" || p.startsWith("/account/") ? "/account" : p).slice(0, 200);
}

export function track(
  event: TrackEvent,
  data: { product?: string; source?: string; value?: number; meta?: Record<string, string | number> } = {},
) {
  try {
    if (typeof window === "undefined" || optedOut()) return;
    const body = JSON.stringify({
      e: event,
      p: currentPath(),
      id: data.product,
      s: data.source,
      v: data.value != null ? Math.max(0, Math.round(data.value)) : undefined,
      m: data.meta,
    });
    if (navigator.sendBeacon?.("/api/e", body)) return;
    void fetch("/api/e", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
  } catch {
    /* analytics never gets in the shopper's way */
  }
}

// The last recommendation card clicked, held in memory only (it survives the
// client-side navigation to the product page, not a reload or a new tab), so an
// add on the product page can be credited to the row that led there.
let lastRec: { slug: string; source: string; at: number } | null = null;
const viaByProduct = new Map<string, string>();

export function trackRecClick(slug: string, source: string) {
  lastRec = { slug, source, at: Date.now() };
  track("rec_click", { product: slug, source });
}

/** Called once by the product page: logs the view and remembers which row led to it. */
export function trackProductView(productId: string, slug: string) {
  const via = lastRec && lastRec.slug === slug && Date.now() - lastRec.at < 30 * 60_000 ? lastRec.source : undefined;
  if (via) viaByProduct.set(productId, via);
  track("product_view", { product: productId, source: via });
}

/** The row that led to this product page, if the shopper came from one. */
export function arrivedVia(productId: string): string | undefined {
  return viaByProduct.get(productId);
}
