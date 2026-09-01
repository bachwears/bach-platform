"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

interface CountRow {
  variant_id: string;
  counted: number;
  system_qty: number;
  name: string;
  size: string;
  color: string;
  sku: string | null;
}

interface UncountedRow {
  variant_id: string;
  name: string;
  size: string;
  color: string;
  sku: string | null;
  quantity: number;
}

interface SearchHit {
  id: string;
  sku: string | null;
  size: string;
  color_en: string;
  products: { name_en: string };
}

export function Stocktake({ branchId, canApply }: { branchId: string; canApply: boolean }) {
  const supabase = supabaseBrowser();
  const scanRef = useRef<HTMLInputElement>(null);
  const [takeId, setTakeId] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [uncounted, setUncounted] = useState<UncountedRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ adjusted: number; total_delta: number } | null>(null);

  const loadState = useCallback(
    async (id: string) => {
      const [{ data: c }, { data: levels }] = await Promise.all([
        supabase
          .from("stocktake_counts")
          .select("variant_id, counted, system_qty, product_variants(sku, size, color_en, products(name_en))")
          .eq("stocktake_id", id)
          .order("counted_at", { ascending: false }),
        supabase
          .from("inventory_levels")
          .select("variant_id, quantity, product_variants!inner(sku, size, color_en, is_active, products!inner(name_en))")
          .eq("branch_id", branchId)
          .gt("quantity", 0),
      ]);
      const countRows = ((c ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
        const pv = r.product_variants as { sku: string | null; size: string; color_en: string; products: { name_en: string } };
        return {
          variant_id: r.variant_id as string,
          counted: r.counted as number,
          system_qty: r.system_qty as number,
          name: pv.products.name_en,
          size: pv.size,
          color: pv.color_en,
          sku: pv.sku,
        };
      });
      setCounts(countRows);
      const countedIds = new Set(countRows.map((r) => r.variant_id));
      setUncounted(
        ((levels ?? []) as unknown as Array<Record<string, unknown>>)
          .filter((l) => !countedIds.has(l.variant_id as string))
          .map((l) => {
            const pv = l.product_variants as { sku: string | null; size: string; color_en: string; is_active: boolean; products: { name_en: string } };
            return {
              variant_id: l.variant_id as string,
              name: pv.products.name_en,
              size: pv.size,
              color: pv.color_en,
              sku: pv.sku,
              quantity: l.quantity as number,
            };
          })
          .filter((l) => l.quantity > 0),
      );
    },
    [branchId, supabase],
  );

  useEffect(() => {
    async function init() {
      const { data, error: err } = await supabase.rpc("stocktake_start", { p_branch_id: branchId });
      if (err) {
        setError("ما قدرنا نفتح جلسة جرد.");
        return;
      }
      setTakeId(data as string);
      void loadState(data as string);
      scanRef.current?.focus();
    }
    void init();
  }, [branchId, loadState, supabase]);

  async function saveCount(variantId: string, counted: number) {
    if (!takeId || counted < 0) return;
    const { error: err } = await supabase.rpc("stocktake_count", {
      p_stocktake_id: takeId,
      p_variant_id: variantId,
      p_counted: counted,
    });
    if (err) setError("ما انحفظ العدّ — جرّب مرة تانية.");
    else {
      setError("");
      void loadState(takeId);
    }
  }

  // Scanning the same barcode again adds one to the tally.
  async function tally(variantId: string) {
    const existing = counts.find((r) => r.variant_id === variantId);
    setLastScanned(variantId);
    await saveCount(variantId, (existing?.counted ?? 0) + 1);
  }

  async function runSearch(text: string, exact: boolean) {
    const q = text.trim();
    if (!q) return;
    const select = "id, sku, size, color_en, products!inner(name_en)";
    if (exact) {
      const { data } = await supabase
        .from("product_variants")
        .select(select)
        .or(`barcode.eq.${q},sku.eq.${q}`)
        .eq("is_active", true)
        .limit(1);
      if (data?.length) {
        setQuery("");
        setResults([]);
        await tally((data[0] as unknown as SearchHit).id);
        scanRef.current?.focus();
        return;
      }
    }
    const { data: skuHits } = await supabase
      .from("product_variants")
      .select(select)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(6);
    let hits = (skuHits ?? []) as unknown as SearchHit[];
    if (!hits.length) {
      const { data: prods } = await supabase.from("products").select("id").or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`).limit(4);
      if (prods?.length) {
        const { data: nameHits } = await supabase
          .from("product_variants")
          .select(select)
          .eq("is_active", true)
          .in("product_id", prods.map((p) => p.id))
          .limit(6);
        hits = (nameHits ?? []) as unknown as SearchHit[];
      }
    }
    setResults(hits);
    if (exact && !hits.length) setError("ما لقينا شي بهالرقم.");
  }

  async function apply() {
    if (!takeId || busy) return;
    const variances = counts.filter((r) => r.counted !== r.system_qty).length;
    if (!window.confirm(`رح نعدّل المخزون حسب العدّ (${variances} فرق). أكيد؟`)) return;
    setBusy(true);
    const { data, error: err } = await supabase.rpc("stocktake_apply", { p_stocktake_id: takeId });
    setBusy(false);
    if (err) {
      setError(`ما مشي التطبيق: ${err.message}`);
      return;
    }
    setSummary(data![0] as { adjusted: number; total_delta: number });
  }

  const variances = counts.filter((r) => r.counted !== r.system_qty);
  const progressTotal = counts.length + uncounted.length;

  if (summary) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border p-8 text-center">
        <p className="text-4xl">✓</p>
        <h2 className="text-xl font-semibold">انطبّق الجرد</h2>
        <p className="text-muted-foreground">
          تعدّل {summary.adjusted} صنف · صافي الفرق{" "}
          <span dir="ltr" className="font-mono">{summary.total_delta > 0 ? `+${summary.total_delta}` : summary.total_delta}</span> قطعة
        </p>
        <Button onClick={() => window.location.reload()}>جرد جديد</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          انعدّ {counts.length} من {progressTotal} صنف بمخزون · {variances.length} فرق
        </p>
        <div className="flex gap-2">
          {canApply && (
            <>
              <Button size="sm" disabled={!counts.length || busy} onClick={() => void apply()}>
                طبّق الجرد
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (takeId && window.confirm("إلغاء جلسة الجرد؟ العدّات بتنحذف.")) {
                    await supabase.rpc("stocktake_cancel", { p_stocktake_id: takeId });
                    window.location.reload();
                  }
                }}
              >
                إلغاء
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Input
          ref={scanRef}
          value={query}
          placeholder="امسح الباركود — كل مسحة بتزيد العدّ ١…"
          className="h-12 text-lg"
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) void runSearch(e.target.value, false);
            else setResults([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch(query, true);
            }
          }}
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
            {results.map((v) => (
              <button
                key={v.id}
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-right hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  void tally(v.id);
                  scanRef.current?.focus();
                }}
              >
                <span>
                  {v.products.name_en} — {v.size} {v.color_en}
                </span>
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      {counts.length > 0 && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-muted-foreground">
                <th className="p-3 font-normal">الصنف</th>
                <th className="p-3 font-normal">بالنظام</th>
                <th className="p-3 font-normal">المعدود</th>
                <th className="p-3 font-normal">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((r) => {
                const delta = r.counted - r.system_qty;
                return (
                  <tr key={r.variant_id} className={`border-b last:border-0 ${lastScanned === r.variant_id ? "bg-muted/50" : ""}`}>
                    <td className="p-3">
                      {r.name}
                      <span className="block text-xs text-muted-foreground">
                        {r.size} {r.color} <span dir="ltr">{r.sku}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono">{r.system_qty}</td>
                    <td className="p-3">
                      <Input
                        value={String(r.counted)}
                        onChange={(e) => {
                          const n = Math.max(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0, 0);
                          setCounts((prev) => prev.map((x) => (x.variant_id === r.variant_id ? { ...x, counted: n } : x)));
                        }}
                        onBlur={(e) => {
                          const n = Math.max(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0, 0);
                          void saveCount(r.variant_id, n);
                        }}
                        className="h-8 w-16 text-left font-mono"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="p-3">
                      {delta === 0 ? (
                        <Badge variant="secondary">✓</Badge>
                      ) : (
                        <Badge variant={delta < 0 ? "destructive" : "default"}>
                          <span dir="ltr">{delta > 0 ? `+${delta}` : delta}</span>
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {uncounted.length > 0 && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            بعد ما انعدّوا ({uncounted.length}) — بيضلّوا عالمخزون الحالي إذا ما انعدّوا
          </summary>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
            {uncounted.map((u) => (
              <li key={u.variant_id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                <span>
                  {u.name} — {u.size} {u.color}
                  <span className="text-xs text-muted-foreground" dir="ltr"> {u.sku}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{u.quantity}</span>
                  <Button size="sm" variant="outline" onClick={() => void saveCount(u.variant_id, 0)}>
                    عدّها صفر
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
