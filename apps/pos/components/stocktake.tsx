"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { EmptyState } from "@bach/ui/components/empty-state";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { barcodeForms, latinDigits, variantPhotos } from "../lib/offline";

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
  // photos come from the till's saved catalogue (read after mount: localStorage)
  const [photoOf, setPhotoOf] = useState<ReturnType<typeof variantPhotos>>(() => () => null);
  useEffect(() => setPhotoOf(() => variantPhotos()), []);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ adjusted: number; total_delta: number } | null>(null);

  const loadState = useCallback(
    async (id: string) => {
      // Both lists can pass the API's 1000-rows-per-request cap (a full count
      // covers every variant), so read them page by page.
      const allRows = async (page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>) => {
        const rows: unknown[] = [];
        for (let from = 0; ; from += 1000) {
          const { data } = await page(from, from + 999);
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
        return { data: rows };
      };
      const [{ data: c }, { data: levels }] = await Promise.all([
        allRows((from, to) =>
          supabase
            .from("stocktake_counts")
            .select("variant_id, counted, system_qty, product_variants(sku, size, color_en, products(name_en))")
            .eq("stocktake_id", id)
            .order("counted_at", { ascending: false })
            .range(from, to),
        ),
        allRows((from, to) =>
          supabase
            .from("inventory_levels")
            .select("variant_id, quantity, product_variants!inner(sku, size, color_en, is_active, products!inner(name_en))")
            .eq("branch_id", branchId)
            .gt("quantity", 0)
            .order("variant_id")
            .range(from, to),
        ),
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
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const q = latinDigits(text).trim().replace(/[,()%*\\]/g, " ").trim();
    if (!q) return;
    const select = "id, sku, size, color_en, products!inner(name_en)";
    if (exact) {
      const { data } = await supabase
        .from("product_variants")
        .select(select)
        // the label's number typed with spaces, or without its check digit, still counts
        .or(
          [...barcodeForms(q).filter((f) => /^[\w-]+$/.test(f)).map((f) => `barcode.eq.${f}`), `sku.eq.${q}`].join(","),
        )
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
      const { data: prods } = await supabase.from("products").select("id").ilike("name_en", `%${q}%`).limit(4);
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
      <div className="mx-auto max-w-md space-y-4 border p-8 text-center">
        <p className="text-4xl font-light">✓</p>
        <h2 className="text-xl font-normal">انطبّق الجرد</h2>
        <p className="text-muted-foreground">
          تعدّل {summary.adjusted} صنف · صافي الفرق{" "}
          <span dir="ltr" className="font-mono">{summary.total_delta > 0 ? `+${summary.total_delta}` : summary.total_delta}</span> قطعة
        </p>
        <Button className="h-11" onClick={() => window.location.reload()}>بلّش جرد جديد</Button>
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
              <Button className="h-10" disabled={!counts.length || busy} onClick={() => void apply()}>
                طبّق الجرد عالمخزون
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={async () => {
                  if (takeId && window.confirm("إلغاء جلسة الجرد؟ العدّات بتنحذف.")) {
                    const { error: err } = await supabase.rpc("stocktake_cancel", { p_stocktake_id: takeId });
                    if (err) {
                      setError(
                        err.message.includes("manager")
                          ? "بس المدير فيه يلغي جلسة الجرد."
                          : `ما انلغت جلسة الجرد: ${err.message}`,
                      );
                      return;
                    }
                    window.location.reload();
                  }
                }}
              >
                ألغِ الجلسة
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
          aria-label="امسح القطعة لتنعدّ"
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
          <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-[60vh] overflow-y-auto border bg-background">
            {results.map((v) => (
              <button
                key={v.id}
                type="button"
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-right hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  void tally(v.id);
                  scanRef.current?.focus();
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Thumb src={photoOf(v.id)} size="sm" />
                  {v.products.name_en} — {v.size} {v.color_en}
                </span>
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="border border-destructive/40 px-4 py-2 text-sm text-destructive">{error}</p>}

      {takeId && counts.length === 0 && (
        <EmptyState icon="stocktake" title="لسّا ما انعدّت ولا قطعة">
          امسح باركود أول قطعة عالرف، وكل مسحة بتزيد عدّها واحد.
        </EmptyState>
      )}

      {counts.length > 0 && (
        <div className="overflow-x-auto border">
          <table className="w-full min-w-[30rem] text-sm">
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
                      <div className="flex items-center gap-3">
                        <Thumb src={photoOf(r.variant_id)} />
                        <div>
                          {r.name}
                          <span className="block text-xs text-muted-foreground">
                            {r.size} {r.color} <span dir="ltr">{r.sku}</span>
                          </span>
                        </div>
                      </div>
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
                        className="h-10 w-16 text-left font-mono md:h-8"
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
        <details className="border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            بعد ما انعدّوا ({uncounted.length}) — بيضلّوا عالمخزون الحالي إذا ما انعدّوا
          </summary>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
            {uncounted.map((u) => (
              <li key={u.variant_id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 hover:bg-muted">
                <span className="flex min-w-0 items-center gap-3">
                  <Thumb src={photoOf(u.variant_id)} size="sm" />
                  <span>
                    {u.name} — {u.size} {u.color}
                    <span className="text-xs text-muted-foreground" dir="ltr"> {u.sku}</span>
                  </span>
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
