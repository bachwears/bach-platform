"use client";


import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";

import { code128Svg } from "../lib/code128";
import { fetchAllPages } from "../lib/fetch-all";

// Label stock presets for the GP-2120TUA (2-inch head, 57mm max web).
const STOCKS: Array<{ key: string; label: string; w: number; h: number }> = [
  { key: "40x30", label: "40×30 مم", w: 40, h: 30 },
  { key: "50x30", label: "50×30 مم", w: 50, h: 30 },
  { key: "57x40", label: "57×40 مم", w: 57, h: 40 },
];

/** A print run this big would choke the browser's print preview. */
const MAX_LABELS = 1500;

const SELECT =
  "id, product_id, sku, barcode, size, color_en, products!inner(name_en, price_usd_cents, sale_price_usd_cents, status, category_id), inventory_levels(quantity)";

interface LabelVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_en: string;
  name_en: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  /** units on hand across branches */
  stock: number;
}

interface QueueLine {
  v: LabelVariant;
  copies: number;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function toVariant(r: Record<string, unknown>): LabelVariant {
  const p = r.products as { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
  const levels = (r.inventory_levels as Array<{ quantity: number }> | null) ?? [];
  return {
    id: r.id as string,
    product_id: r.product_id as string,
    sku: r.sku as string | null,
    barcode: r.barcode as string | null,
    size: r.size as string,
    color_en: r.color_en as string,
    name_en: p.name_en,
    price_usd_cents: p.price_usd_cents,
    sale_price_usd_cents: p.sale_price_usd_cents,
    stock: levels.reduce((s, l) => s + Math.max(l.quantity, 0), 0),
  };
}

/** Codes pasted as a list: one per line, or split by commas/spaces/tabs. */
function splitCodes(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map((c) => c.trim()).filter((c) => c.length >= 3))];
}

export function LabelPrinting({ productIds = [] }: { productIds?: string[] }) {
  const supabase = supabaseBrowser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LabelVariant[]>([]);
  const [queue, setQueue] = useState<QueueLine[]>([]);
  const [stockKey, setStockKey] = useState("40x30");
  const stock = STOCKS.find((s) => s.key === stockKey)!;
  const [photos, setPhotos] = useState<PhotoMap | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // bulk: a whole category (or everything) in stock
  const [cats, setCats] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [bulkCat, setBulkCat] = useState("all");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    void loadFrontPhotos(supabase).then(setPhotos);
    // only categories that hold published products
    void supabase
      .from("categories")
      .select("id, name_ar, products!inner(id)")
      .eq("is_active", true)
      .eq("products.status", "published")
      .order("sort")
      .then(({ data }) => setCats(((data ?? []) as Array<{ id: string; name_ar: string }>).map((c) => ({ id: c.id, name_ar: c.name_ar }))));
  }, [supabase]);

  const addMany = useCallback((vs: LabelVariant[], copies: (v: LabelVariant) => number = () => 1) => {
    setQueue((prev) => {
      const next = [...prev];
      for (const v of vs) {
        const i = next.findIndex((l) => l.v.id === v.id);
        if (i >= 0) next[i] = { ...next[i]!, copies: next[i]!.copies + copies(v) };
        else next.push({ v, copies: copies(v) });
      }
      return next;
    });
  }, []);

  // "Print label" from the catalogue: arrive with the product's pieces queued,
  // one label per unit in stock (at least one each).
  useEffect(() => {
    if (!productIds.length) return;
    void supabase
      .from("product_variants")
      .select(SELECT)
      .eq("is_active", true)
      .in("product_id", productIds)
      .order("size")
      .then(({ data }) => {
        const vs = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(toVariant);
        addMany(vs, (v) => Math.max(v.stock, 1));
        if (vs.length) setMsg({ ok: true, text: `انضافوا ${vs.length} قطعة — النسخ = الكمية بالمخزون. عدّلها إذا لزم.` });
      });
    // run once for the ids in the link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(text: string) {
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const q = text.trim().replace(/[,()%*\\]/g, " ").trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const { data: skuHits } = await supabase
      .from("product_variants")
      .select(SELECT)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(20);
    let rows = (skuHits ?? []) as unknown as Array<Record<string, unknown>>;
    if (!rows.length) {
      const { data: prods } = await supabase.from("products").select("id").ilike("name_en", `%${q}%`).limit(8);
      if (prods?.length) {
        const { data: nameHits } = await supabase
          .from("product_variants")
          .select(SELECT)
          .eq("is_active", true)
          .in("product_id", prods.map((p) => p.id))
          .limit(40);
        rows = (nameHits ?? []) as unknown as Array<Record<string, unknown>>;
      }
    }
    setResults(rows.map(toVariant));
  }

  // Several codes at once (pasted from a sheet or scanned one per line).
  async function addPasted() {
    const codes = splitCodes(paste);
    if (!codes.length) return;
    setBusy(true);
    setMsg(null);
    const found: LabelVariant[] = [];
    // in chunks: the filter goes in the URL
    for (let i = 0; i < codes.length; i += 60) {
      const chunk = codes.slice(i, i + 60);
      const list = chunk.map((c) => `"${c.replace(/"/g, "")}"`).join(",");
      const { data, error } = await supabase
        .from("product_variants")
        .select(SELECT)
        .eq("is_active", true)
        .or(`sku.in.(${list}),barcode.in.(${list})`);
      if (error) {
        setBusy(false);
        setMsg({ ok: false, text: `ما مشي البحث: ${error.message}` });
        return;
      }
      found.push(...((data ?? []) as unknown as Array<Record<string, unknown>>).map(toVariant));
    }
    const hit = new Set(found.flatMap((v) => [v.sku?.toLowerCase(), v.barcode?.toLowerCase()]));
    const missing = codes.filter((c) => !hit.has(c.toLowerCase()));
    addMany(found);
    setBusy(false);
    setPaste("");
    setMsg({
      ok: missing.length === 0,
      text: `انضافوا ${found.length} قطعة.` + (missing.length ? ` ما لقينا: ${missing.slice(0, 12).join("، ")}${missing.length > 12 ? "…" : ""}` : ""),
    });
  }

  // Everything in stock, or one category: one label per unit on hand.
  async function addBulk() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await fetchAllPages((a, b) => {
      let q = supabase
        .from("product_variants")
        .select(SELECT)
        .eq("is_active", true)
        .eq("products.status", "published");
      if (bulkCat !== "all") q = q.eq("products.category_id", bulkCat);
      return q.order("id").range(a, b);
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `ما مشي: ${error.message}` });
    const vs = (data as unknown as Array<Record<string, unknown>>).map(toVariant).filter((v) => v.stock > 0);
    const total = vs.reduce((s, v) => s + v.stock, 0);
    if (!vs.length) return setMsg({ ok: false, text: "ما في قطع بالمخزون بهالاختيار." });
    if (labelsCount + total > MAX_LABELS) {
      return setMsg({
        ok: false,
        text: `هيدا ${total.toLocaleString("en-US")} ليبل — كتير عطبعة وحدة (الحد ${MAX_LABELS}). اختار فئة وحدة بالمرة.`,
      });
    }
    addMany(vs, (v) => v.stock);
    setMsg({ ok: true, text: `انضافوا ${vs.length} قطعة — ${total} ليبل (ليبل لكل قطعة بالمخزون).` });
  }

  const labelsCount = queue.reduce((s, l) => s + l.copies, 0);
  const labels = queue.flatMap((l) => Array.from({ length: l.copies }, () => l.v));
  const photo = (v: LabelVariant) => photoFor(photos, v.product_id, v.color_en);

  return (
    <div className="space-y-4">
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                void search(e.target.value);
              }}
              placeholder="دوّر: SKU أو باركود أو اسم القطعة…"
              className="h-10"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-96 w-full overflow-y-auto border bg-background">
                <button
                  type="button"
                  className="w-full border-b px-3 py-2 text-right text-sm font-medium hover:bg-muted"
                  onClick={() => {
                    addMany(results);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  زيد كل النتائج ({results.length})
                </button>
                {results.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm hover:bg-muted"
                    onClick={() => {
                      addMany([v]);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <Thumb src={photo(v)} size="sm" />
                      <span>
                        {v.name_en} — {v.size} {v.color_en}
                        <span className="block text-xs text-muted-foreground">بالمخزون: {v.stock}</span>
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {v.sku}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={stockKey}
            onChange={(e) => setStockKey(e.target.value)}
            className="h-10 border bg-transparent px-2 text-sm"
            aria-label="قياس الليبل"
          >
            {STOCKS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button disabled={!labels.length || labelsCount > MAX_LABELS} onClick={() => window.print()}>
            <Icon name="print" size={16} /> اطبع {labels.length > 0 ? `(${labels.length})` : ""}
          </Button>
          {queue.length > 0 && (
            <Button variant="ghost" onClick={() => setQueue([])}>
              فضّي
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">طباعة بالجملة:</span>
          <select
            value={bulkCat}
            onChange={(e) => setBulkCat(e.target.value)}
            className="h-9 border bg-transparent px-2 text-sm"
            aria-label="الفئة"
          >
            <option value="all">كل القطع بالمخزون</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void addBulk()}>
            زيد — ليبل لكل قطعة بالمخزون
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPaste((s) => !s)}>
            الصق أكتر من كود
          </Button>
        </div>

        {showPaste && (
          <div className="space-y-2 border p-3">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              dir="ltr"
              placeholder={"BW-SWE-012-BLK-M\n2000000000015\n…"}
              className="w-full border bg-transparent p-2 font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={busy || !paste.trim()} onClick={() => void addPasted()}>
                {busy ? "عم دوّر…" : `زيد (${splitCodes(paste).length})`}
              </Button>
              <span className="text-xs text-muted-foreground">SKU أو باركود — سطر لكل كود، أو مفصولين بفاصلة.</span>
            </div>
          </div>
        )}

        {msg && <p className={`text-sm ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</p>}
      </div>

      {queue.length > 0 && (
        <div className="space-y-2 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {queue.length} قطعة · {labelsCount} ليبل
              {labelsCount > MAX_LABELS ? (
                <span className="text-destructive"> — أكتر من {MAX_LABELS}، قسّمها على أكتر من طبعة</span>
              ) : null}
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setQueue((prev) => prev.map((l) => ({ ...l, copies: 1 })))}>
                نسخة وحدة لكل قطعة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQueue((prev) => prev.map((l) => ({ ...l, copies: Math.max(l.v.stock, 1) })))}
              >
                النسخ = الكمية بالمخزون
              </Button>
            </span>
          </div>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
            {queue.map((l) => (
              <li key={l.v.id} className="flex flex-wrap items-center gap-3 border px-3 py-2">
                <Thumb src={photo(l.v)} />
                <span className="flex-1">
                  {l.v.name_en} — {l.v.size} {l.v.color_en}
                  <span className="block text-xs text-muted-foreground">
                    <span dir="ltr">{l.v.sku}</span> · بالمخزون: {l.v.stock}
                  </span>
                </span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  النسخ
                  <Input
                    value={String(l.copies)}
                    onChange={(e) => {
                      const n = Math.min(Math.max(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 1, 1), 500);
                      setQueue((prev) => prev.map((x) => (x.v.id === l.v.id ? { ...x, copies: n } : x)));
                    }}
                    className="h-8 w-16 text-left font-mono"
                    inputMode="numeric"
                  />
                </label>
                <Button size="sm" variant="ghost" onClick={() => setQueue((prev) => prev.filter((x) => x.v.id !== l.v.id))}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Print sheet: one label per page at the exact stock size. */}
      <style>{`@media print { @page { size: ${stock.w}mm ${stock.h}mm; margin: 0; } }`}</style>
      {labels.length > 0 && labelsCount <= MAX_LABELS && (
        <div className="print-labels border p-4 print:rounded-none print:border-0 print:p-0">
          <p className="mb-3 text-xs text-muted-foreground print:hidden">
            معاينة — {labels.length} ليبل عقياس {stock.label}:
          </p>
          <div className="flex flex-wrap gap-2 print:block">
            {labels.map((v, i) => {
              const code = v.barcode ?? v.sku ?? "";
              const svg = code ? code128Svg(code, Math.max(stock.h * 0.3, 8)) : null;
              return (
                <div
                  key={`${v.id}-${i}`}
                  dir="ltr"
                  className="label-card overflow-hidden border border-dashed bg-white text-black print:border-0"
                  style={{
                    width: `${stock.w}mm`,
                    height: `${stock.h}mm`,
                    padding: "1.5mm",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    breakAfter: "page",
                  }}
                >
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo-bach.png" alt="BACH" style={{ height: "2.6mm", width: "auto" }} />
                      <span style={{ fontWeight: 700, fontSize: "3.2mm" }}>
                        {usd(Math.min(v.sale_price_usd_cents ?? v.price_usd_cents, v.price_usd_cents))}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "2.4mm",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {v.name_en}
                    </div>
                    <div style={{ fontSize: "2.4mm", fontWeight: 600 }}>
                      {v.size}
                      {v.color_en && v.color_en !== "Standard" ? ` · ${v.color_en}` : ""}
                    </div>
                  </div>
                  <div>
                    {svg ? (
                      <div dangerouslySetInnerHTML={{ __html: svg }} />
                    ) : (
                      <div style={{ fontSize: "2.2mm" }}>—</div>
                    )}
                    <div style={{ fontSize: "2mm", textAlign: "center", fontFamily: "monospace" }}>{code}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-labels, .print-labels * { visibility: visible; }
          .print-labels { position: absolute; inset: 0; }
          .label-card { margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
