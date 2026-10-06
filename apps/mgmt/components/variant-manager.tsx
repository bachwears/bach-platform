"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { NOT_SAVED } from "../lib/access";
import { Label } from "@bach/ui/components/label";

import { ColourPicker, SizePicker, Swatch, useColours, type Colour } from "./colour-picker";

export interface Variant {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  color_ar: string;
  sku: string | null;
  barcode: string | null;
  is_active: boolean;
  /** sellable units across branches (quantity − reserved); read-only here */
  stock?: number;
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const [sizes, setSizes] = useState<string[]>([]);
  const [colour, setColour] = useState<Colour | null>(null);
  const { colours } = useColours();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // one block per colour, sizes in size order
  const groups = new Map<string, Variant[]>();
  for (const v of variants) groups.set(v.color_code, [...(groups.get(v.color_code) ?? []), v]);
  const colourList = [...groups.values()].map((list) => [...list].sort((a, b) => sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size)));

  // picking one of this product's colours: add more sizes to it
  function pickColour(v: Variant) {
    const known = colours.find((c) => c.name_en.toLowerCase() === v.color_en.toLowerCase());
    setColour({ code: v.color_code, name_en: v.color_en, name_ar: v.color_ar, hex: known?.hex ?? null, hex2: known?.hex2 ?? null, family: known?.family ?? null });
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!colour) return setError("اختار اللون");
    if (!sizes.length) return setError("اختار مقاس واحد أقل شي");
    // a colour this product already has keeps its code (it's inside the SKUs on the labels)
    const same = variants.find((v) => v.color_en.toLowerCase() === colour.name_en.toLowerCase());
    const colorCode = same?.color_code ?? colour.code;
    setBusy("add");
    const { data, error: insertError } = await supabaseBrowser()
      .from("product_variants")
      .insert(sizes.map((s) => ({ product_id: productId, size: s, color_code: colorCode, color_en: colour.name_en, color_ar: colour.name_ar })))
      .select("id");
    setBusy(null);
    if (insertError) {
      setError(insertError.code === "23505" ? "واحد من هالمقاسات بهاللون موجود من قبل" : "ما زبط: " + insertError.message);
      return;
    }
    if (!data?.length) return setError(NOT_SAVED);
    setSizes([]);
    router.refresh();
  }

  async function toggleActive(v: Variant) {
    setBusy(v.id);
    setError(null);
    const { data: changed, error: err } = await supabaseBrowser()
      .from("product_variants")
      .update({ is_active: !v.is_active })
      .eq("id", v.id)
      .select("id");
    setBusy(null);
    if (err) return setError("ما زبط: " + err.message);
    if (!changed?.length) return setError(NOT_SAVED);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {colourList.length ? (
        <div className="space-y-3">
          {colourList.map((list) => {
            const head = list[0]!;
            const stock = list.reduce((n, v) => n + (v.stock ?? 0), 0);
            return (
              <div key={head.color_code} className="overflow-hidden border">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2 text-sm">
                  <Swatch c={colours.find((c) => c.name_en.toLowerCase() === head.color_en.toLowerCase()) ?? null} className="h-4 w-4" />
                  <span className="font-medium" dir="ltr">
                    {head.color_en}
                  </span>
                  <span className="text-muted-foreground">{head.color_ar}</span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {head.color_code}
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground tabular-nums">ستوك {stock}</span>
                  <button type="button" onClick={() => pickColour(head)} className="text-xs underline underline-offset-2">
                    + مقاس بهاللون
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-start font-medium">المقاس</th>
                        <th className="px-3 py-2 text-start font-medium">SKU</th>
                        <th className="px-3 py-2 text-start font-medium">ستوك</th>
                        <th className="px-3 py-2 text-start font-medium">الحالة</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((v) => (
                        <tr key={v.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium" dir="ltr">
                            {v.size}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                            {v.sku}
                          </td>
                          <td className={`px-3 py-2 tabular-nums ${(v.stock ?? 0) <= 0 ? "text-muted-foreground" : ""}`}>{v.stock ?? 0}</td>
                          <td className="px-3 py-2">
                            <Badge variant={v.is_active ? "success" : "outline"}>{v.is_active ? "فعّال" : "موقّف"}</Badge>
                          </td>
                          <td className="px-3 py-2 text-end">
                            <Button variant="ghost" size="sm" disabled={busy === v.id} onClick={() => void toggleActive(v)}>
                              {v.is_active ? "وقّف" : "فعّل"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            الستوك هون للقراءة بس — بيتعدّل من{" "}
            <a href="/inventory" className="underline underline-offset-2">
              المخزون
            </a>{" "}
            (استلام، جرد، تحويل).
          </p>
        </div>
      ) : (
        <p className="border p-4 text-sm text-muted-foreground">ما في فاريانتس بعد — ضيف أول لون ومقاساتو، والـ SKU بينعمل لحاله.</p>
      )}

      <form onSubmit={addVariant} className="space-y-3 border p-4">
        <p className="text-sm font-medium">زيد لون أو مقاسات</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>اللون</Label>
            <ColourPicker value={colour} onChange={setColour} />
          </div>
          <div className="space-y-1">
            <Label>المقاسات</Label>
            <SizePicker value={sizes} onChange={setSizes} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy === "add"}>
            {busy === "add" ? "عم نضيف…" : "+ ضيف"}
          </Button>
          <p className="text-xs text-muted-foreground">اختار اللون من اللائحة ونقّي المقاسات. الـ SKU والباركود بينعملو لحالهن.</p>
        </div>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
