"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

const LETTER_SIZES = ["S", "M", "L", "XL", "XXL"];
const PANT_SIZES = ["30", "32", "34", "36", "38"];
const SHOE_SIZES = ["40", "41", "42", "43", "44", "45"];
const BOTTOM_CATS = new Set(["PNT", "JNS", "JOG", "SHR", "TR"]);
const SHOE_CATS = new Set(["SHO"]);

function defaultSizes(cat: string | null): string[] {
  if (cat && SHOE_CATS.has(cat)) return SHOE_SIZES;
  if (cat && BOTTOM_CATS.has(cat)) return PANT_SIZES;
  return LETTER_SIZES;
}

interface OneSizeProduct {
  id: string;
  name_en: string;
  sku: string | null;
  variant_id: string;
  cat: string | null;
  catName: string | null;
  stock: number;
}

export function SizeExpansion({ branchId }: { branchId: string }) {
  const supabase = supabaseBrowser();
  const [products, setProducts] = useState<OneSizeProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // per-product working state
  const [qty, setQty] = useState<Record<string, string>>({}); // key `${productId}:${size}`
  const [sizes, setSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("product_variants")
      .select(
        "id, sku, product_id, products!inner(id, name_en, categories(code, name_ar)), inventory_levels(branch_id, quantity)",
      )
      .eq("size", "OS")
      .eq("is_active", true)
      .limit(1000);
    const rows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((v) => {
      const p = v.products as { id: string; name_en: string; categories: { code: string; name_ar: string } | null };
      const level = ((v.inventory_levels as Array<{ branch_id: string; quantity: number }>) ?? []).find(
        (l) => l.branch_id === branchId,
      );
      return {
        id: p.id,
        name_en: p.name_en,
        sku: v.sku as string | null,
        variant_id: v.id as string,
        cat: p.categories?.code ?? null,
        catName: p.categories?.name_ar ?? null,
        stock: level?.quantity ?? 0,
      };
    });
    rows.sort((a, b) => b.stock - a.stock || a.name_en.localeCompare(b.name_en));
    setProducts(rows);
    setLoaded(true);
  }, [branchId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  function openProduct(p: OneSizeProduct) {
    setOpenId(p.id);
    setSizes(defaultSizes(p.cat));
    setCustomSize("");
    setError("");
  }

  function sumFor(p: OneSizeProduct, sizeList: string[]) {
    return sizeList.reduce((s, sz) => s + (parseInt(qty[`${p.id}:${sz}`] ?? "", 10) || 0), 0);
  }

  async function apply(p: OneSizeProduct) {
    if (busy) return;
    const items = sizes.map((sz) => ({ size: sz, quantity: parseInt(qty[`${p.id}:${sz}`] ?? "", 10) || 0 }));
    if (!items.length) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("expand_variant_sizes", {
      p_product_id: p.id,
      p_branch_id: branchId,
      p_items: items,
    });
    setBusy(false);
    if (err) {
      setError(`ما مشي التوزيع: ${err.message}`);
      return;
    }
    setOpenId(null);
    setDoneCount((n) => n + 1);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  const cats = [...new Map(products.filter((p) => p.cat).map((p) => [p.cat!, p.catName ?? p.cat!])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );
  const visible = products.filter(
    (p) =>
      (!catFilter || p.cat === catFilter) &&
      (!filter.trim() ||
        p.name_en.toLowerCase().includes(filter.trim().toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(filter.trim().toLowerCase())),
  );

  if (!loaded) return <p className="p-8 text-center text-muted-foreground">عم يحمّل…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="فتّش بالاسم أو SKU…"
          className="h-9 w-64"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">كل الفئات</option>
          {cats.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          باقي {products.length} موديل بمقاس واحد
          {doneCount > 0 && <span className="text-green-600 dark:text-green-400"> · خلّصت {doneCount} ✓</span>}
        </span>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      {visible.length === 0 && (
        <p className="p-8 text-center text-muted-foreground">
          {products.length === 0 ? "ما ضل ولا موديل بمقاس واحد 🎉" : "ما في نتائج بهالفلتر."}
        </p>
      )}

      <ul className="space-y-3">
        {visible.slice(0, 40).map((p) => {
          const open = openId === p.id;
          const total = sumFor(p, sizes);
          return (
            <li key={p.id} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-right"
                onClick={() => (open ? setOpenId(null) : openProduct(p))}
              >
                <span>
                  {p.name_en}
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {p.sku}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {p.catName && <Badge variant="outline">{p.catName}</Badge>}
                  <Badge variant={p.stock > 0 ? "secondary" : "outline"}>{p.stock} بالمخزون</Badge>
                </span>
              </button>

              {open && (
                <div className="space-y-3 border-t px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">المقاسات:</span>
                    {sizes.map((sz) => (
                      <span key={sz} className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <span dir="ltr">{sz}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setSizes((prev) => prev.filter((x) => x !== sz))}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <Input
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="+ مقاس"
                      className="h-7 w-20 text-left font-mono"
                      dir="ltr"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customSize.trim() && !sizes.includes(customSize.trim())) {
                          setSizes((prev) => [...prev, customSize.trim()]);
                          setCustomSize("");
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {sizes.map((sz) => (
                      <label key={sz} className="flex items-center gap-1 text-sm">
                        <span className="w-8 font-mono" dir="ltr">
                          {sz}
                        </span>
                        <Input
                          value={qty[`${p.id}:${sz}`] ?? ""}
                          onChange={(e) =>
                            setQty({ ...qty, [`${p.id}:${sz}`]: e.target.value.replace(/[^0-9]/g, "") })
                          }
                          placeholder="0"
                          className="h-8 w-16 text-left font-mono"
                          inputMode="numeric"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm ${total === p.stock ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      الموزّع: {total} / {p.stock} بالمخزون
                      {total !== p.stock && total > 0 && " — مش لازم يتطابقوا، عدّك عالرف هو الصح"}
                    </p>
                    <Button size="sm" disabled={busy || !sizes.length} onClick={() => void apply(p)}>
                      وزّع المقاسات
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {visible.length > 40 && (
        <p className="text-center text-xs text-muted-foreground">معروض أول ٤٠ — فلتر أو فتّش لتشوف الباقي.</p>
      )}
    </div>
  );
}
