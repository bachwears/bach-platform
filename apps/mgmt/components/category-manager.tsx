"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";

export interface CategoryRow {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  productCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[A-Z]{2,4}$/.test(code)) {
      setError("الكود لازم يكون 2-4 أحرف كبيرة (مثلاً SH) — بيدخل بتركيبة الـ SKU");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: insertError } = await supabase
      .from("categories")
      .insert({ code, name_ar: nameAr, name_en: nameEn });
    setBusy(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "هالكود مستعمل من قبل" : "ما زبط: " + insertError.message);
      return;
    }
    setCode("");
    setNameAr("");
    setNameEn("");
    router.refresh();
  }

  async function toggleActive(c: CategoryRow) {
    const supabase = supabaseBrowser();
    await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {categories.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">الكود</th>
                <th className="p-3 text-start font-medium">الاسم</th>
                <th className="p-3 text-start font-medium">المنتجات</th>
                <th className="p-3 text-start font-medium">الحالة</th>
                <th className="p-3 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-mono" dir="ltr">{c.code}</td>
                  <td className="p-3">
                    {c.name_ar}
                    <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{c.name_en}</span>
                  </td>
                  <td className="p-3">{c.productCount}</td>
                  <td className="p-3">
                    <Badge variant={c.is_active ? "success" : "outline"}>
                      {c.is_active ? "فعّالة" : "موقّفة"}
                    </Badge>
                  </td>
                  <td className="p-3 text-end">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                      {c.is_active ? "وقّف" : "فعّل"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">
          ما في فئات بعد — ضيف أول فئة لتقدر تعمل منتجات.
        </p>
      )}

      <form onSubmit={addCategory} className="grid items-end gap-3 rounded-md border p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="c-code">الكود (للـ SKU)</Label>
          <Input id="c-code" dir="ltr" required placeholder="SH" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-ar">الاسم بالعربي</Label>
          <Input id="c-ar" required placeholder="قمصان" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-en">الاسم بالإنكليزي</Label>
          <Input id="c-en" dir="ltr" required placeholder="Shirts" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "عم نضيف…" : "+ ضيف فئة"}
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
