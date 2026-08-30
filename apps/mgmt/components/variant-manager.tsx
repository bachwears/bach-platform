"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";

export interface Variant {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  color_ar: string;
  sku: string | null;
  barcode: string | null;
  is_active: boolean;
}

export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const [size, setSize] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [colorEn, setColorEn] = useState("");
  const [colorAr, setColorAr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[A-Z]{2,3}$/.test(colorCode)) {
      setError("كود اللون لازم يكون 2-3 أحرف كبيرة (مثلاً NVY)");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: insertError } = await supabase.from("product_variants").insert({
      product_id: productId,
      size: size.trim().toUpperCase(),
      color_code: colorCode,
      color_en: colorEn,
      color_ar: colorAr,
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "هالمقاس واللون موجودين من قبل"
          : "ما زبط: " + insertError.message,
      );
      return;
    }
    setSize("");
    setColorCode("");
    setColorEn("");
    setColorAr("");
    router.refresh();
  }

  async function toggleActive(v: Variant) {
    const supabase = supabaseBrowser();
    await supabase.from("product_variants").update({ is_active: !v.is_active }).eq("id", v.id);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">الفاريانتس (مقاس × لون)</h2>

      {variants.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">المقاس</th>
                <th className="p-3 text-start font-medium">اللون</th>
                <th className="p-3 text-start font-medium">SKU</th>
                <th className="p-3 text-start font-medium">الحالة</th>
                <th className="p-3 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="p-3">{v.size}</td>
                  <td className="p-3">
                    {v.color_ar} <span className="text-xs text-muted-foreground">({v.color_code})</span>
                  </td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{v.sku}</td>
                  <td className="p-3">
                    <Badge variant={v.is_active ? "success" : "outline"}>
                      {v.is_active ? "فعّال" : "موقّف"}
                    </Badge>
                  </td>
                  <td className="p-3 text-end">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(v)}>
                      {v.is_active ? "وقّف" : "فعّل"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          ما في فاريانتس بعد — ضيف أول مقاس ولون، والـ SKU بينعمل لحاله.
        </p>
      )}

      <form onSubmit={addVariant} className="grid items-end gap-3 rounded-md border p-4 sm:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="v-size">المقاس</Label>
          <Input id="v-size" dir="ltr" required placeholder="M" value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="v-code">كود اللون</Label>
          <Input id="v-code" dir="ltr" required placeholder="NVY" value={colorCode} onChange={(e) => setColorCode(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="v-en">اللون EN</Label>
          <Input id="v-en" dir="ltr" required placeholder="Navy" value={colorEn} onChange={(e) => setColorEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="v-ar">اللون AR</Label>
          <Input id="v-ar" required placeholder="كحلي" value={colorAr} onChange={(e) => setColorAr(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "عم نضيف…" : "+ ضيف"}
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
