"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

import { code128Svg } from "../lib/code128";

// Label stock presets for the GP-2120TUA (2-inch head, 57mm max web).
const STOCKS: Array<{ key: string; label: string; w: number; h: number }> = [
  { key: "40x30", label: "40×30 مم", w: 40, h: 30 },
  { key: "50x30", label: "50×30 مم", w: 50, h: 30 },
  { key: "57x40", label: "57×40 مم", w: 57, h: 40 },
];

interface LabelVariant {
  id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_en: string;
  name_en: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
}

interface QueueLine {
  v: LabelVariant;
  copies: number;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function LabelPrinting() {
  const supabase = supabaseBrowser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LabelVariant[]>([]);
  const [queue, setQueue] = useState<QueueLine[]>([]);
  const [stockKey, setStockKey] = useState("40x30");
  const stock = STOCKS.find((s) => s.key === stockKey)!;

  async function search(text: string) {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const select =
      "id, sku, barcode, size, color_en, products!inner(name_en, price_usd_cents, sale_price_usd_cents)";
    const { data: skuHits } = await supabase
      .from("product_variants")
      .select(select)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(6);
    let rows = (skuHits ?? []) as unknown as Array<Record<string, unknown>>;
    if (!rows.length) {
      const { data: prods } = await supabase
        .from("products")
        .select("id")
        .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`)
        .limit(4);
      if (prods?.length) {
        const { data: nameHits } = await supabase
          .from("product_variants")
          .select(select)
          .eq("is_active", true)
          .in("product_id", prods.map((p) => p.id))
          .limit(8);
        rows = (nameHits ?? []) as unknown as Array<Record<string, unknown>>;
      }
    }
    setResults(
      rows.map((r) => {
        const p = r.products as { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
        return {
          id: r.id as string,
          sku: r.sku as string | null,
          barcode: r.barcode as string | null,
          size: r.size as string,
          color_en: r.color_en as string,
          name_en: p.name_en,
          price_usd_cents: p.price_usd_cents,
          sale_price_usd_cents: p.sale_price_usd_cents,
        };
      }),
    );
  }

  function add(v: LabelVariant) {
    setQuery("");
    setResults([]);
    setQueue((prev) =>
      prev.some((l) => l.v.id === v.id)
        ? prev.map((l) => (l.v.id === v.id ? { ...l, copies: l.copies + 1 } : l))
        : [...prev, { v, copies: 1 }],
    );
  }

  const labels = queue.flatMap((l) => Array.from({ length: l.copies }, () => l.v));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              void search(e.target.value);
            }}
            placeholder="ضيف قطعة: SKU أو باركود أو اسم…"
            className="h-10"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {results.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-muted"
                  onClick={() => add(v)}
                >
                  <span>
                    {v.name_en} — {v.size} {v.color_en}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select
          value={stockKey}
          onChange={(e) => setStockKey(e.target.value)}
          className="h-10 rounded-md border bg-transparent px-2 text-sm"
        >
          {STOCKS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <Button disabled={!labels.length} onClick={() => window.print()}>
          🖨 اطبع {labels.length > 0 ? `(${labels.length})` : ""}
        </Button>
        {queue.length > 0 && (
          <Button variant="ghost" onClick={() => setQueue([])}>
            فضّي
          </Button>
        )}
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2 text-sm print:hidden">
          {queue.map((l) => (
            <li key={l.v.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
              <span className="flex-1">
                {l.v.name_en} — {l.v.size} {l.v.color_en}
                <span className="text-xs text-muted-foreground" dir="ltr"> {l.v.sku}</span>
              </span>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                النسخ
                <Input
                  value={String(l.copies)}
                  onChange={(e) => {
                    const n = Math.min(Math.max(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 1, 1), 200);
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
      )}

      {/* Print sheet: one label per page at the exact stock size. */}
      <style>{`@media print { @page { size: ${stock.w}mm ${stock.h}mm; margin: 0; } }`}</style>
      {labels.length > 0 && (
        <div className="print-labels rounded-lg border p-4 print:rounded-none print:border-0 print:p-0">
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, letterSpacing: "0.15em", fontSize: "2.6mm" }}>BACH</span>
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
