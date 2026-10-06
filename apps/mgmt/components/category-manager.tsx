"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { NOT_SAVED } from "../lib/access";
import { Label } from "@bach/ui/components/label";
import { Icon } from "@bach/ui/components/icon";

export interface CategoryRow {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  parent_id: string | null;
  productCount: number;
}

/** Tree order: each category followed by the ones under it, with its depth. */
function inTreeOrder(categories: CategoryRow[]) {
  const out: Array<CategoryRow & { depth: number }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of categories.filter((k) => k.parent_id === parent)) {
      if (out.some((o) => o.id === c.id)) continue;
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // anything whose parent is missing still shows up
  for (const c of categories) if (!out.some((o) => o.id === c.id)) out.push({ ...c, depth: 0 });
  return out;
}

/** c and every category under it — none of them can become c's parent. */
function selfAndBelow(categories: CategoryRow[], id: string) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState("");
  const rows = inTreeOrder(categories);
  const label = (c: CategoryRow & { depth?: number }) => `${"— ".repeat(c.depth ?? 0)}${c.name_ar} (${c.code})`;
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
      .insert({ code, name_ar: nameAr, name_en: nameEn, parent_id: parentId || null });
    setBusy(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "هالكود مستعمل من قبل" : "ما زبط: " + insertError.message);
      return;
    }
    setCode("");
    setNameAr("");
    setNameEn("");
    setParentId("");
    router.refresh();
  }

  async function moveTo(c: CategoryRow, parent: string) {
    setError(null);
    const { data: changed, error: e } = await supabaseBrowser()
      .from("categories")
      .update({ parent_id: parent || null })
      .eq("id", c.id)
      .select("id");
    if (e) setError("ما زبط: " + e.message);
    else if (!changed?.length) setError(NOT_SAVED);
    router.refresh();
  }

  async function toggleActive(c: CategoryRow) {
    const supabase = supabaseBrowser();
    const { data: changed } = await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id).select("id");
    if (!changed?.length) window.alert(NOT_SAVED);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {categories.length ? (
        <div className="overflow-x-auto border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-start font-medium">الكود</th>
                <th className="p-3 text-start font-medium">الاسم</th>
                <th className="p-3 text-start font-medium">تحت</th>
                <th className="p-3 text-start font-medium">المنتجات</th>
                <th className="p-3 text-start font-medium">الحالة</th>
                <th className="p-3 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-mono" dir="ltr">{c.code}</td>
                  <td className="p-3" style={{ paddingInlineStart: `${0.75 + c.depth * 1.25}rem` }}>
                    {c.depth ? <span className="me-1 text-muted-foreground">↳</span> : null}
                    {c.name_ar}
                    <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{c.name_en}</span>
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`الفئة الأم لـ ${c.name_ar}`}
                      value={c.parent_id ?? ""}
                      onChange={(e) => void moveTo(c, e.target.value)}
                      className="h-9 max-w-[14rem] border bg-background px-2 text-sm"
                    >
                      <option value="">— رئيسية —</option>
                      {rows
                        .filter((p) => !selfAndBelow(categories, c.id).has(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {label(p)}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-3">{c.productCount}</td>
                  <td className="p-3">
                    <Badge variant={c.is_active ? "success" : "outline"}>
                      {c.is_active ? "فعّالة" : "موقّفة"}
                    </Badge>
                  </td>
                  <td className="p-3 text-end">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>
                      {c.is_active ? "وقّف الفئة" : "فعّل الفئة"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border p-6 text-sm text-muted-foreground">
          ما في فئات بعد — زيد أول فئة من الخانات تحت لتقدر تعمل منتجات.
        </p>
      )}

      <form onSubmit={addCategory} className="grid items-end gap-3 border p-4 sm:grid-cols-5">
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
        <div className="space-y-1">
          <Label htmlFor="c-parent">تحت فئة</Label>
          <select
            id="c-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-9 w-full border bg-background px-2 text-sm"
          >
            <option value="">— رئيسية —</option>
            {rows.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={busy}>
          <Icon name="add" size={16} />
          {busy ? "عم نزيد…" : "زيد الفئة"}
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
