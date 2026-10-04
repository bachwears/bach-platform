"use client";

import { useState } from "react";
import { HintDot } from "@bach/ui/components/hint-dot";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Textarea } from "@bach/ui/components/textarea";

import { NOT_SAVED } from "../lib/access";

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
  material_en: string;
  care_en: string;
  meta_title_en: string;
  meta_description_en: string;
  /** comma-separated product_seasons values */
  seasons: string;
  /** the product's tags as loaded (kept as-is apart from the "hero" pin) */
  tags?: string[];
  /** pinned as a price anchor at the top of the shop ("hero" tag) */
  hero: boolean;
}

// The fits the catalogue actually uses (shown as-is on the product page).
const FITS = ["Slim fit", "Regular fit", "Oversized", "Baggy fit", "One size", "True to size"];
const SEASONS: Array<[string, string]> = [
  ["winter", "شتوي"],
  ["spring", "ربيعي"],
  ["summer", "صيفي"],
  ["autumn", "خريفي"],
  ["all_season", "كل المواسم"],
];

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
  material_en: "",
  care_en: "",
  meta_title_en: "",
  meta_description_en: "",
  seasons: "",
  hero: false,
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

  function set<K extends keyof ProductValues>(key: K, value: ProductValues[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name_en" && isNew) next.slug = slugify(String(value));
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
      name_ar: values.name_en,
      slug: values.slug,
      category_id: values.category_id,
      price_usd_cents: priceCents,
      sale_price_usd_cents: saleCents,
      status: values.status,
      description_en: values.description_en || null,
      description_ar: null,
      fit: values.fit || null,
      material_en: values.material_en.trim() || null,
      care_en: values.care_en.trim() || null,
      meta_title_en: values.meta_title_en.trim() || null,
      meta_description_en: values.meta_description_en.trim() || null,
      // the hero pin lives in tags (storefront never shows tags)
      tags: [...(values.tags ?? []).filter((t) => t !== "hero"), ...(values.hero ? ["hero"] : [])],
    };
    const wantSeasons = values.seasons.split(",").filter(Boolean);
    // product_seasons is a plain list per product: replace it with what's ticked
    async function saveSeasons(productId: string) {
      const { error: delErr } = await supabase.from("product_seasons").delete().eq("product_id", productId);
      if (delErr) return delErr.message;
      if (!wantSeasons.length) return null;
      const { error: insErr } = await supabase
        .from("product_seasons")
        .insert(wantSeasons.map((season) => ({ product_id: productId, season })));
      return insErr?.message ?? null;
    }

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
      const seasonErr = await saveSeasons(data.id);
      if (seasonErr) setError("المنتج انعمل بس المواسم ما انحفظت: " + seasonErr);
      router.replace(`/products/${data.id}`);
      router.refresh();
      return;
    }

    const { data: changed, error: updateError } = await supabase
      .from("products")
      .update(row)
      .eq("id", initial!.id!)
      .select("id");
    if (updateError || !changed?.length) {
      setError(updateError ? "ما قدرنا نحفظ التعديلات: " + updateError.message : NOT_SAVED);
      setBusy(false);
      return;
    }
    const seasonErr = await saveSeasons(initial!.id!);
    if (seasonErr) {
      setError("التعديلات انحفظت بس المواسم لا: " + seasonErr);
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name_en">اسم المنتج (بالإنكليزي — قرار العلامة: الأسماء إنكليزي فقط)</Label>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="desc_en">الوصف (بالإنكليزي)</Label>
          <Textarea id="desc_en" dir="ltr" value={values.description_en} onChange={(e) => set("description_en", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fit">القَصّة (fit)</Label>
          <Select id="fit" value={values.fit} onChange={(e) => set("fit", e.target.value)}>
            <option value="">—</option>
            {[...FITS, ...(values.fit && !FITS.includes(values.fit) ? [values.fit] : [])].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="material">الخامة (Material، بالإنكليزي)</Label>
          <Input id="material" dir="ltr" placeholder="Cotton blend" value={values.material_en} onChange={(e) => set("material_en", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="care">العناية (Care، بالإنكليزي)</Label>
          <Textarea id="care" dir="ltr" rows={2} placeholder="Machine wash cold. Do not bleach." value={values.care_en} onChange={(e) => set("care_en", e.target.value)} />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg border p-4">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={values.hero}
          onChange={(e) => set("hero", e.target.checked)}
        />
        <span className="space-y-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            ثبّتها كقطعة «هيرو»
            <HintDot
              hint={{
                title: "القطعة الهيرو",
                what: "قطعة بتنحطّ أوّل شي بالشوب وبصفحة فئتها (وبين كل ٨ قطع)، لتصير هي السعر المرجعي يلّي الزبون بيقارن فيه باقي القطع. منختار قطع مميّزة وغالية متل الجاكيتات.",
                source: "تاغ hero على المنتج. الترتيب «Featured» بالشوب بيقرا هالتاغ أوّل، وبعدين الأغلى بكل صفحة.",
                edit: "من هون: علّم أو شيل العلامة واحفظ. بيبيّن عالموقع خلال دقيقة.",
              }}
            />
          </span>
          <span className="block text-xs text-muted-foreground">بتطلع أوّل شي بالشوب وبفئتها. أحسن شي ٣ لـ ٦ قطع بالمرّة.</span>
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">المواسم</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SEASONS.map(([key, label]) => {
            const on = values.seasons.split(",").includes(key);
            return (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={on}
                  onChange={() => {
                    const list = values.seasons.split(",").filter(Boolean);
                    set("seasons", (on ? list.filter((x) => x !== key) : [...list, key]).join(","));
                  }}
                />
                {label}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">تبديل موسم المتجر والحملات بيشتغلوا على هالمواسم.</p>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Google (SEO)</legend>
        <div className="space-y-2">
          <Label htmlFor="meta_title">العنوان بنتائج البحث</Label>
          <Input id="meta_title" dir="ltr" maxLength={70} placeholder={`${values.name_en || "Product"} | BACH Wears`} value={values.meta_title_en} onChange={(e) => set("meta_title_en", e.target.value)} />
          <p className={`text-xs ${values.meta_title_en.length > 60 ? "text-amber-600" : "text-muted-foreground"}`} dir="ltr">
            {values.meta_title_en.length} / 60
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta_desc">الوصف بنتائج البحث</Label>
          <Textarea id="meta_desc" dir="ltr" rows={2} maxLength={200} value={values.meta_description_en} onChange={(e) => set("meta_description_en", e.target.value)} />
          <p className={`text-xs ${values.meta_description_en.length > 160 ? "text-amber-600" : "text-muted-foreground"}`} dir="ltr">
            {values.meta_description_en.length} / 160
          </p>
        </div>
        <p className="text-xs text-muted-foreground">إذا فاضيين، Google بياخد اسم المنتج والوصف.</p>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-brand-brass">انحفظ ✓</p> : null}

      <Button type="submit" disabled={busy}>
        {busy ? "عم نحفظ…" : isNew ? "إنشاء المنتج" : "حفظ التعديلات"}
      </Button>
    </form>
  );
}
