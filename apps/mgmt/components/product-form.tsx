"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Textarea } from "@bach/ui/components/textarea";

export interface Category {
  id: string;
  name_ar: string;
  code: string;
}

export interface ProductValues {
  id?: string;
  name_en: string;
  name_ar: string;
  slug: string;
  category_id: string;
  price_usd: string;
  sale_price_usd: string;
  status: string;
  description_en: string;
  description_ar: string;
  fit: string;
}

const EMPTY: ProductValues = {
  name_en: "",
  name_ar: "",
  slug: "",
  category_id: "",
  price_usd: "",
  sale_price_usd: "",
  status: "draft",
  description_en: "",
  description_ar: "",
  fit: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: ProductValues;
}) {
  const router = useRouter();
  const isNew = !initial?.id;
  const [values, setValues] = useState<ProductValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof ProductValues>(key: K, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name_en" && isNew) next.slug = slugify(value);
      return next;
    });
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceCents = Math.round(parseFloat(values.price_usd) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError("حط سعر صحيح بالدولار");
      return;
    }
    const saleCents = values.sale_price_usd
      ? Math.round(parseFloat(values.sale_price_usd) * 100)
      : null;

    setBusy(true);
    const supabase = supabaseBrowser();
    const row = {
      name_en: values.name_en,
      name_ar: values.name_ar,
      slug: values.slug,
      category_id: values.category_id,
      price_usd_cents: priceCents,
      sale_price_usd_cents: saleCents,
      status: values.status,
      description_en: values.description_en || null,
      description_ar: values.description_ar || null,
      fit: values.fit || null,
    };

    if (isNew) {
      const { data, error: insertError } = await supabase
        .from("products")
        .insert(row)
        .select("id")
        .single();
      if (insertError) {
        setError(
          insertError.code === "23505"
            ? "الرابط (slug) مستعمل من قبل — غيّره"
            : "ما قدرنا نحفظ المنتج: " + insertError.message,
        );
        setBusy(false);
        return;
      }
      router.replace(`/products/${data.id}`);
      router.refresh();
      return;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(row)
      .eq("id", initial!.id!);
    if (updateError) {
      setError("ما قدرنا نحفظ التعديلات: " + updateError.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name_ar">الاسم بالعربي</Label>
          <Input id="name_ar" required value={values.name_ar} onChange={(e) => set("name_ar", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_en">الاسم بالإنكليزي</Label>
          <Input id="name_en" dir="ltr" required value={values.name_en} onChange={(e) => set("name_en", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slug">الرابط (slug)</Label>
          <Input id="slug" dir="ltr" required pattern="[a-z0-9-]+" value={values.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">الفئة</Label>
          <Select id="category" required value={values.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">اختار فئة…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar} ({c.code})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">السعر (USD)</Label>
          <Input id="price" dir="ltr" type="number" step="0.01" min="0" required value={values.price_usd} onChange={(e) => set("price_usd", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sale">سعر التخفيض (اختياري)</Label>
          <Input id="sale" dir="ltr" type="number" step="0.01" min="0" value={values.sale_price_usd} onChange={(e) => set("sale_price_usd", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">الحالة</Label>
          <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">مؤرشف</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="desc_ar">الوصف بالعربي</Label>
          <Textarea id="desc_ar" value={values.description_ar} onChange={(e) => set("description_ar", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc_en">الوصف بالإنكليزي</Label>
          <Textarea id="desc_en" dir="ltr" value={values.description_en} onChange={(e) => set("description_en", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="fit">القَصّة (fit)</Label>
        <Select id="fit" value={values.fit} onChange={(e) => set("fit", e.target.value)}>
          <option value="">—</option>
          <option value="slim">Slim</option>
          <option value="regular">Regular</option>
          <option value="relaxed">Relaxed</option>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-brand-brass">انحفظ ✓</p> : null}

      <Button type="submit" disabled={busy}>
        {busy ? "عم نحفظ…" : isNew ? "إنشاء المنتج" : "حفظ التعديلات"}
      </Button>
    </form>
  );
}
