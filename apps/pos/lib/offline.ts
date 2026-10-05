"use client";

import { fetchAllPages } from "./fetch-all";
import { loadFrontPhotos, photoFor } from "@bach/ui/lib/photos";
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
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  available: number;
  /** small front photo in this colour (400px), for telling pieces apart */
  photo?: string | null;
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

/**
 * Photo of a variant from the till's saved catalogue (any branch), for screens
 * that list pieces (invoices, returns, stocktake). Null when it isn't saved yet.
 */
export function variantPhotos(): (variantId: string | null | undefined) => string | null {
  let byId = new Map<string, string | null>();
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) byId = new Map((JSON.parse(raw) as CatalogBlob).items.map((i) => [i.id, i.photo ?? null]));
  } catch {
    // no saved catalogue: rows show an empty frame
  }
  return (id) => (id ? (byId.get(id) ?? null) : null);
}

export async function refreshCatalog(supabase: SupabaseClient, branchId: string): Promise<CatalogBlob | null> {
  // Over 1,000 sellable variants: read every page, or the rest silently vanish
  // from the till and their barcodes come back "not found".
  const [{ data, error }, { data: aliasRows }, photos] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from("product_variants")
        .select(
          "id, product_id, sku, barcode, size, color_en, color_ar, price_usd_cents_override, products!inner(name_en, price_usd_cents, sale_price_usd_cents, status), inventory_levels(branch_id, quantity, reserved)",
        )
        .eq("is_active", true)
        .eq("products.status", "published")
        .order("id")
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from("product_variants")
        .select("barcode, product_id, products!inner(status)")
        .eq("is_active", false)
        .eq("size", "OS")
        .eq("products.status", "published")
        .not("barcode", "is", null)
        .order("id")
        .range(from, to),
    ),
    loadFrontPhotos(supabase).catch(() => null),
  ]);
  if (error || !data) return readCatalog(branchId);
  const items: CatalogItem[] = (data as unknown as Array<Record<string, unknown>>).map((v) => {
    const p = v.products as { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
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
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      available: level ? level.quantity - level.reserved : 0,
      product_id: v.product_id as string,
      photo: photoFor(photos, v.product_id as string, v.color_en as string),
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

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits → 0-9. A scanner types through the
 * computer's keyboard layout, so on an Arabic layout a barcode can arrive as ١٢٣.
 */
export function latinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** The ways one barcode can arrive: as typed, without spaces/dashes, and with the EAN-13 check digit added back. */
export function barcodeForms(query: string): string[] {
  const q = query.trim().toLowerCase();
  const compact = q.replace(/[\s-]/g, "");
  const forms = [q, compact];
  if (/^\d{12}$/.test(compact)) {
    const sum = compact.split("").reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
    forms.push(compact + String((10 - (sum % 10)) % 10));
  }
  return [...new Set(forms)];
}

export function searchCatalog(
  items: CatalogItem[],
  query: string,
  exact: boolean,
  aliases: BarcodeAlias[] = [],
): CatalogItem[] {
  const q = latinDigits(query).trim().toLowerCase();
  if (!q) return [];
  if (exact) {
    // a barcode typed by hand from the label ("2 000000 000015"), or sent by a
    // scanner set to drop the EAN-13 check digit, still finds its piece
    const codes = barcodeForms(q);
    const hit = items.find((i) => (i.barcode && codes.includes(i.barcode.toLowerCase())) || i.sku?.toLowerCase() === q);
    if (hit) return [hit];
    // Physical tag of a retired one-size variant: offer the product's sizes.
    const alias = aliases.find((a) => codes.includes(a.barcode.toLowerCase()));
    if (alias) return items.filter((i) => i.product_id === alias.product_id);
    return [];
  }
  return items
    .filter(
      (i) =>
        i.sku?.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q) ||
        i.name_en.toLowerCase().includes(q) ||
        false,
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
  /** Net drawer lines (net: true); sales queued by older tills carry tendered amounts. */
  payments: Array<{ currency: string; amount_minor: number; net?: boolean }>;
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

type SyncResult = { synced: number; failed: number; remaining: number };

// Single-flight: mount, the `online` event and the "sync now" button can all fire at once.
let syncInFlight: Promise<SyncResult> | null = null;

/**
 * Replay queued sales. Returns counts; stops on connectivity errors,
 * marks business rejections as failed (kept for manager review).
 * Each outcome is applied to a fresh read of the queue, so sales enqueued
 * while a sync is running are never overwritten.
 */
export function syncQueue(supabase: SupabaseClient): Promise<SyncResult> {
  if (!syncInFlight) {
    syncInFlight = runSync(supabase).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

function applyOutcome(clientRef: string, outcome: { synced: true } | { failReason: string }) {
  const current = readQueue();
  writeQueue(
    "synced" in outcome
      ? current.filter((s) => s.clientRef !== clientRef)
      : current.map((s) => (s.clientRef === clientRef ? { ...s, status: "failed" as const, failReason: outcome.failReason } : s)),
  );
}

function summary(synced: number): SyncResult {
  const q = readQueue();
  return { synced, failed: q.filter((s) => s.status === "failed").length, remaining: q.length };
}

async function runSync(supabase: SupabaseClient): Promise<SyncResult> {
  let synced = 0;
  const pending = readQueue().filter((s) => s.status === "pending");
  for (const sale of pending) {
    let error: { message?: string; code?: string } | null = null;
    try {
      ({ error } = await supabase.rpc("pos_checkout", {
        p_branch_id: sale.branchId,
        p_items: sale.items,
        p_payments: sale.payments,
        p_discount_basis_points: sale.discountBp,
        p_acting_cashier: sale.actingCashier,
        p_client_ref: sale.clientRef,
      }));
    } catch {
      error = { message: "Failed to fetch" };
    }
    // 23505 on client_ref: a concurrent replay already landed this exact sale.
    if (!error || error.code === "23505") {
      applyOutcome(sale.clientRef, { synced: true });
      synced += 1;
      continue;
    }
    const message = error.message ?? "";
    const isNetwork = /fetch|network|failed to|load failed/i.test(message) && !/insufficient|invalid|not allowed|exception/i.test(message);
    if (isNetwork) {
      // Still offline: leave this and everything after it untouched.
      return summary(synced);
    }
    applyOutcome(sale.clientRef, { failReason: message });
  }
  return summary(synced);
}

/** Put a failed sale back in line for the next sync. */
export function retryQueued(clientRef: string) {
  writeQueue(
    readQueue().map((s) => (s.clientRef === clientRef ? { ...s, status: "pending" as const, failReason: undefined } : s)),
  );
}

export function removeFromQueue(clientRef: string) {
  writeQueue(readQueue().filter((s) => s.clientRef !== clientRef));
}
