"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Local catalog (local-first search; survives connection loss) ----

export interface CatalogItem {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_en: string;
  color_ar: string;
  price_usd_cents_override: number | null;
  name_en: string;
  name_ar: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  available: number;
}

const CATALOG_KEY = "bach-pos-catalog";
const QUEUE_KEY = "bach-pos-queue";
export const CATALOG_TTL_MS = 5 * 60 * 1000;

export interface BarcodeAlias {
  barcode: string;
  product_id: string;
}

interface CatalogBlob {
  at: number;
  branchId: string;
  items: CatalogItem[];
  /** Retired one-size variants: their physical tag barcode resolves to the product's sizes. */
  aliases?: BarcodeAlias[];
}

export function readCatalog(branchId: string): CatalogBlob | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as CatalogBlob;
    return blob.branchId === branchId ? blob : null;
  } catch {
    return null;
  }
}

export async function refreshCatalog(supabase: SupabaseClient, branchId: string): Promise<CatalogBlob | null> {
  const [{ data, error }, { data: aliasRows }] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id, product_id, sku, barcode, size, color_en, color_ar, price_usd_cents_override, products!inner(name_en, name_ar, price_usd_cents, sale_price_usd_cents, status), inventory_levels(branch_id, quantity, reserved)",
      )
      .eq("is_active", true)
      .eq("products.status", "published"),
    supabase
      .from("product_variants")
      .select("barcode, product_id, products!inner(status)")
      .eq("is_active", false)
      .eq("size", "OS")
      .eq("products.status", "published")
      .not("barcode", "is", null),
  ]);
  if (error || !data) return readCatalog(branchId);
  const items: CatalogItem[] = (data as unknown as Array<Record<string, unknown>>).map((v) => {
    const p = v.products as { name_en: string; name_ar: string; price_usd_cents: number; sale_price_usd_cents: number | null };
    const level = ((v.inventory_levels as Array<{ branch_id: string; quantity: number; reserved: number }>) ?? []).find(
      (l) => l.branch_id === branchId,
    );
    return {
      id: v.id as string,
      sku: v.sku as string | null,
      barcode: v.barcode as string | null,
      size: v.size as string,
      color_en: v.color_en as string,
      color_ar: v.color_ar as string,
      price_usd_cents_override: v.price_usd_cents_override as number | null,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      available: level ? level.quantity - level.reserved : 0,
      product_id: v.product_id as string,
    };
  });
  const aliases: BarcodeAlias[] = ((aliasRows ?? []) as Array<{ barcode: string; product_id: string }>).map((a) => ({
    barcode: a.barcode,
    product_id: a.product_id,
  }));
  const blob: CatalogBlob = { at: Date.now(), branchId, items, aliases };
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(blob));
  } catch {
    /* storage full — search still works from memory via return value */
  }
  return blob;
}

export function searchCatalog(
  items: CatalogItem[],
  query: string,
  exact: boolean,
  aliases: BarcodeAlias[] = [],
): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (exact) {
    const hit = items.find((i) => i.barcode?.toLowerCase() === q || i.sku?.toLowerCase() === q);
    if (hit) return [hit];
    // Physical tag of a retired one-size variant: offer the product's sizes.
    const alias = aliases.find((a) => a.barcode.toLowerCase() === q);
    if (alias) return items.filter((i) => i.product_id === alias.product_id);
    return [];
  }
  return items
    .filter(
      (i) =>
        i.sku?.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q) ||
        i.name_en.toLowerCase().includes(q) ||
        i.name_ar.includes(query.trim()),
    )
    .slice(0, 8);
}

/** Adjust cached availability after a local (offline) sale. */
export function decrementCatalog(branchId: string, lines: Array<{ variantId: string; quantity: number }>) {
  const blob = readCatalog(branchId);
  if (!blob) return;
  for (const l of lines) {
    const item = blob.items.find((i) => i.id === l.variantId);
    if (item) item.available = Math.max(0, item.available - l.quantity);
  }
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(blob));
  } catch {
    /* ignore */
  }
}

// ---- Offline sales queue ----

export interface QueuedSale {
  clientRef: string;
  at: string;
  branchId: string;
  items: Array<{ variant_id: string; quantity: number; line_discount_bp: number }>;
  payments: Array<{ currency: string; amount_minor: number }>;
  discountBp: number;
  actingCashier: string | null;
  totalUsdCents: number;
  status: "pending" | "failed";
  failReason?: string;
}

export function readQueue(): QueuedSale[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const q = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(q) ? (q as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedSale[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueueSale(sale: QueuedSale) {
  writeQueue([...readQueue(), sale]);
}

/**
 * Replay queued sales. Returns counts; stops on connectivity errors,
 * marks business rejections as failed (kept for manager review).
 */
export async function syncQueue(supabase: SupabaseClient): Promise<{ synced: number; failed: number; remaining: number }> {
  let synced = 0;
  let failed = 0;
  const queue = readQueue();
  const keep: QueuedSale[] = [];
  for (const sale of queue) {
    if (sale.status === "failed") {
      keep.push(sale);
      failed += 1;
      continue;
    }
    const { error } = await supabase.rpc("pos_checkout", {
      p_branch_id: sale.branchId,
      p_items: sale.items,
      p_payments: sale.payments,
      p_discount_basis_points: sale.discountBp,
      p_acting_cashier: sale.actingCashier,
      p_client_ref: sale.clientRef,
    });
    if (!error) {
      synced += 1;
      continue;
    }
    const message = error.message ?? "";
    const isNetwork = /fetch|network|failed to|load failed/i.test(message) && !/insufficient|invalid|not allowed|exception/i.test(message);
    if (isNetwork) {
      // Still offline: keep this and everything after it, untouched.
      keep.push(sale);
      const idx = queue.indexOf(sale);
      keep.push(...queue.slice(idx + 1).filter((s) => s !== sale));
      writeQueue(keep);
      return { synced, failed, remaining: keep.length };
    }
    keep.push({ ...sale, status: "failed", failReason: message });
    failed += 1;
  }
  writeQueue(keep);
  return { synced, failed, remaining: keep.length };
}

export function removeFromQueue(clientRef: string) {
  writeQueue(readQueue().filter((s) => s.clientRef !== clientRef));
}
