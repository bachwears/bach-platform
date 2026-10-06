"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HintDot } from "@bach/ui/components/hint-dot";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Textarea } from "@bach/ui/components/textarea";

import { NOT_SAVED } from "../lib/access";
import { ColourPicker, SizePicker, Swatch, type Colour } from "./colour-picker";

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
  /** purchase cost (staff only, never on the storefront) */
  cost_usd: string;
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
export const SEASONS: Array<[string, string]> = [
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
  cost_usd: "",
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

/** Dollars typed by staff → integer cents (no floating-point money is stored). */
function toCents(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  const [whole, frac = ""] = t.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

interface Editor {
  values: ProductValues;
  categories: Category[];
  isNew: boolean;
  set: <K extends keyof ProductValues>(key: K, value: ProductValues[K]) => void;
  save: () => Promise<boolean>;
  busy: boolean;
  error: string | null;
  saved: boolean;
  dirty: boolean;
}

const EditorContext = createContext<Editor | null>(null);

export function useProductEditor(): Editor {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useProductEditor needs <ProductEditorProvider>");
  return ctx;
}

/**
 * Holds the product's own fields (basics, details, SEO) for the whole page, so
 * they can sit in separate sections and still save together from one button.
 */
export function ProductEditorProvider({
  categories,
  initial,
  onCreated,
  children,
}: {
  categories: Category[];
  initial?: ProductValues;
  /** new products: runs after the insert (variants, next product); true = stay on this screen */
  onCreated?: (id: string, values: ProductValues) => Promise<boolean>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isNew = !initial?.id;
  const [values, setValues] = useState<ProductValues>(initial ?? EMPTY);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial ?? EMPTY));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = useMemo(() => JSON.stringify(values) !== baseline, [values, baseline]);

  const set = useCallback(<K extends keyof ProductValues>(key: K, value: ProductValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name_en" && isNew) next.slug = slugify(String(value));
      return next;
    });
    setSaved(false);
  }, [isNew]);

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const save = useCallback(async (): Promise<boolean> => {
    const values = valuesRef.current;
    setError(null);
    setSaved(false);

    if (!values.name_en.trim()) return setError("اكتب اسم المنتج"), false;
    if (!/^[a-z0-9-]+$/.test(values.slug)) return setError("الرابط (slug) لازم يكون أحرف إنكليزي صغيرة وأرقام و- بس"), false;
    if (!values.category_id) return setError("اختار فئة"), false;
    const priceCents = toCents(values.price_usd);
    if (priceCents == null || !Number.isFinite(priceCents)) return setError("حط سعر صحيح بالدولار (مثلاً 49 أو 49.90)"), false;
    const saleCents = toCents(values.sale_price_usd);
    if (saleCents != null && !Number.isFinite(saleCents)) return setError("سعر التخفيض مش مزبوط"), false;
    if (saleCents != null && saleCents >= priceCents) return setError("سعر التخفيض لازم يكون أقل من السعر الأساسي"), false;
    const costCents = toCents(values.cost_usd);
    if (costCents != null && !Number.isFinite(costCents)) return setError("سعر الكلفة مش مزبوط"), false;

    setBusy(true);
    const supabase = supabaseBrowser();
    const row = {
      name_en: values.name_en.trim(),
      name_ar: values.name_en.trim(),
      slug: values.slug,
      category_id: values.category_id,
      price_usd_cents: priceCents,
      sale_price_usd_cents: saleCents,
      cost_usd_cents: costCents,
      status: values.status,
      description_en: values.description_en.trim() || null,
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
      const { data, error: insErr } = await supabase
        .from("product_seasons")
        .insert(wantSeasons.map((season) => ({ product_id: productId, season })))
        .select("season");
      if (insErr) return insErr.message;
      return data?.length ? null : NOT_SAVED;
    }

    if (isNew) {
      const { data, error: insertError } = await supabase.from("products").insert(row).select("id").single();
      if (insertError || !data) {
        setError(
          insertError?.code === "23505"
            ? "الرابط (slug) مستعمل من قبل — غيّره"
            : insertError
              ? "ما قدرنا نحفظ المنتج: " + insertError.message
              : NOT_SAVED,
        );
        setBusy(false);
        return false;
      }
      const seasonErr = await saveSeasons(data.id);
      if (seasonErr) setError("المنتج انعمل بس المواسم ما انحفظت: " + seasonErr);
      if (onCreated && (await onCreated(data.id, values))) {
        setBusy(false);
        return true;
      }
      router.replace(`/products/${data.id}`);
      router.refresh();
      return true;
    }

    const { data: changed, error: updateError } = await supabase
      .from("products")
      .update(row)
      .eq("id", initial!.id!)
      .select("id");
    if (updateError || !changed?.length) {
      setError(
        updateError?.code === "23505"
          ? "الرابط (slug) مستعمل لمنتج تاني — غيّره"
          : updateError
            ? "ما قدرنا نحفظ التعديلات: " + updateError.message
            : NOT_SAVED,
      );
      setBusy(false);
      return false;
    }
    const seasonErr = await saveSeasons(initial!.id!);
    setBusy(false);
    if (seasonErr) {
      setError("التعديلات انحفظت بس المواسم لا: " + seasonErr);
      return false;
    }
    setBaseline(JSON.stringify(values));
    setSaved(true);
    router.refresh();
    return true;
  }, [initial, isNew, router, onCreated]);

  // unsaved edits: warn before leaving, and Ctrl/Cmd+S saves
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!busy) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, save]);

  const editor = useMemo<Editor>(
    () => ({ values, categories, isNew, set, save, busy, error, saved, dirty }),
    [values, categories, isNew, set, save, busy, error, saved, dirty],
  );
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}

function Field({ id, label, hint, children, className }: { id?: string; label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Name, link, category, prices and status. */
export function BasicsFields() {
  const { values, set, categories, isNew } = useProductEditor();
  const price = toCents(values.price_usd);
  const sale = toCents(values.sale_price_usd);
  const cost = toCents(values.cost_usd);
  const sell = sale != null && Number.isFinite(sale) ? sale : price;
  const margin =
    cost != null && Number.isFinite(cost) && sell != null && Number.isFinite(sell) && sell > 0
      ? Math.round(((sell - cost) / sell) * 100)
      : null;
  return (
    <div className="space-y-5">
      <Field id="name_en" label="اسم المنتج (بالإنكليزي)" hint="قرار العلامة: أسماء المنتجات إنكليزي بس.">
        <Input id="name_en" dir="ltr" required value={values.name_en} onChange={(e) => set("name_en", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="slug" className="flex items-center gap-2">
            الرابط (slug)
            <HintDot
              hint={{
                title: "رابط المنتج",
                what: "آخر جزء من عنوان المنتج عالموقع: bachwears.com/products/هيدا-الرابط.",
                source: "عمود slug بجدول products.",
                edit: isNew
                  ? "بيتعبّى لحالو من الاسم. أحرف إنكليزي صغيرة وأرقام و- بس."
                  : "من هون. انتبه: إذا غيّرتو لمنتج منشور، الروابط القديمة (غوغل، واتساب) بتوقف تشتغل.",
              }}
            />
          </Label>
          <Input id="slug" dir="ltr" required pattern="[a-z0-9-]+" value={values.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <Field id="category" label="الفئة">
          <Select id="category" required value={values.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">اختار فئة…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar} ({c.code})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="price" label="السعر (USD)">
          <Input id="price" dir="ltr" inputMode="decimal" type="number" step="0.01" min="0" required value={values.price_usd} onChange={(e) => set("price_usd", e.target.value)} />
        </Field>
        <Field id="sale" label="سعر التخفيض" hint="فاضي = بلا تخفيض.">
          <Input id="sale" dir="ltr" inputMode="decimal" type="number" step="0.01" min="0" value={values.sale_price_usd} onChange={(e) => set("sale_price_usd", e.target.value)} />
        </Field>
        <div className="space-y-1.5">
          <Label htmlFor="cost" className="flex items-center gap-2">
            سعر الكلفة
            <HintDot
              hint={{
                title: "سعر الكلفة",
                what: "قدّيش كلّفتنا القطعة. ما بيطلع عالموقع أبداً — بس للتقارير وهامش الربح.",
                source: "عمود cost_usd_cents بجدول products. بيتحدّث كمان لحالو لمّا تستلم طلبيّة شراء.",
                edit: "من هون، أو من «المشتريات» عند الاستلام.",
              }}
            />
          </Label>
          <Input id="cost" dir="ltr" inputMode="decimal" type="number" step="0.01" min="0" value={values.cost_usd} onChange={(e) => set("cost_usd", e.target.value)} />
          <p className="text-xs text-muted-foreground">{margin != null ? `هامش الربح تقريباً ${margin}%` : "ما بيبيّن للزبون."}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="status" label="الحالة" hint="«منشور» بس بيبيّن عالموقع — وكمان لازم يكون إلو صورة أساسية.">
          <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">مؤرشف</option>
          </Select>
        </Field>
        <label className="flex items-start gap-3 rounded-lg border p-3 sm:mt-6">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={values.hero} onChange={(e) => set("hero", e.target.checked)} />
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
      </div>
    </div>
  );
}

/** Description, fit, material, care and seasons. */
export function DetailsFields() {
  const { values, set } = useProductEditor();
  return (
    <div className="space-y-5">
      <Field id="desc_en" label="الوصف (بالإنكليزي)" hint="جملتين أو تلاتة: شو القطعة، شو بيميّزها، مع شو بتنلبس.">
        <Textarea id="desc_en" dir="ltr" rows={4} value={values.description_en} onChange={(e) => set("description_en", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fit" label="القَصّة (fit)">
          <Select id="fit" value={values.fit} onChange={(e) => set("fit", e.target.value)}>
            <option value="">—</option>
            {[...FITS, ...(values.fit && !FITS.includes(values.fit) ? [values.fit] : [])].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="material" label="الخامة (Material، بالإنكليزي)">
          <Input id="material" dir="ltr" placeholder="Cotton blend" value={values.material_en} onChange={(e) => set("material_en", e.target.value)} />
        </Field>
      </div>

      <Field id="care" label="العناية (Care، بالإنكليزي)">
        <Textarea id="care" dir="ltr" rows={2} placeholder="Machine wash cold. Do not bleach." value={values.care_en} onChange={(e) => set("care_en", e.target.value)} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">المواسم</legend>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map(([key, label]) => {
            const on = values.seasons.split(",").includes(key);
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
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
    </div>
  );
}

/** Google title and description. */
export function SeoFields() {
  const { values, set } = useProductEditor();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="meta_title">العنوان بنتائج البحث</Label>
        <Input id="meta_title" dir="ltr" maxLength={70} placeholder={`${values.name_en || "Product"} | BACH Wears`} value={values.meta_title_en} onChange={(e) => set("meta_title_en", e.target.value)} />
        <p className={`text-xs ${values.meta_title_en.length > 60 ? "text-amber-600" : "text-muted-foreground"}`} dir="ltr">
          {values.meta_title_en.length} / 60
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meta_desc">الوصف بنتائج البحث</Label>
        <Textarea id="meta_desc" dir="ltr" rows={2} maxLength={200} value={values.meta_description_en} onChange={(e) => set("meta_description_en", e.target.value)} />
        <p className={`text-xs ${values.meta_description_en.length > 160 ? "text-amber-600" : "text-muted-foreground"}`} dir="ltr">
          {values.meta_description_en.length} / 160
        </p>
      </div>
      <div className="rounded-md border bg-muted/30 p-3" dir="ltr">
        <p className="truncate text-sm text-blue-700 dark:text-blue-400">{values.meta_title_en || `${values.name_en || "Product"} | BACH Wears`}</p>
        <p className="truncate text-xs text-emerald-700 dark:text-emerald-400">bachwears.com/products/{values.slug || "…"}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{values.meta_description_en || values.description_en || "—"}</p>
      </div>
      <p className="text-xs text-muted-foreground">إذا فاضيين، Google بياخد اسم المنتج والوصف.</p>
    </div>
  );
}

/** Save button + result for one place on the page (each section can show one). */
export function SaveProductButton({ className }: { className?: string }) {
  const { save, busy, saved, dirty, error, isNew } = useProductEditor();
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      <Button type="button" disabled={busy || (!dirty && !isNew)} onClick={() => void save()}>
        {busy ? "عم نحفظ…" : isNew ? "إنشاء المنتج" : "حفظ التعديلات"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : saved && !dirty ? <p className="text-sm text-brand-brass">انحفظ ✓</p> : dirty ? <p className="text-xs text-muted-foreground">في تعديلات ما انحفظت</p> : null}
    </div>
  );
}

/** The plain form for a new product: everything on one screen, one save. */
export function ProductForm({ categories, initial }: { categories: Category[]; initial?: ProductValues }) {
  // "save and add the next one" remounts a fresh form that keeps the category,
  // prices and details of the product just saved — the usual run of similar pieces
  const [run, setRun] = useState<{ key: number; start?: ProductValues; last?: string }>({ key: 0, start: initial });
  const [colours, setColours] = useState<Colour[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const next = useRef(false);
  const router = useRouter();

  const onCreated = useCallback(
    async (id: string, v: ProductValues) => {
      // every colour × every size picked becomes a variant (SKU + barcode made by the database)
      if (colours.length && sizes.length) {
        const rows = colours.flatMap((c) =>
          sizes.map((size) => ({ product_id: id, size, color_code: c.code, color_en: c.name_en, color_ar: c.name_ar })),
        );
        const { error } = await supabaseBrowser().from("product_variants").insert(rows);
        if (error) {
          window.alert(`المنتج انعمل، بس الألوان والمقاسات ما انحفظت: ${error.message}\nكمّلها من صفحة المنتج.`);
          return false;
        }
      }
      if (!next.current) return false;
      setRun((r) => ({
        key: r.key + 1,
        last: v.name_en,
        start: { ...EMPTY, category_id: v.category_id, price_usd: v.price_usd, sale_price_usd: v.sale_price_usd, cost_usd: v.cost_usd, status: v.status, fit: v.fit, material_en: v.material_en, care_en: v.care_en, seasons: v.seasons },
      }));
      router.refresh();
      window.scrollTo({ top: 0 });
      return true;
    },
    [colours, sizes, router],
  );

  return (
    <div className="space-y-4">
      {run.last && (
        <p className="border p-3 text-sm">
          انعمل «<span dir="ltr">{run.last}</span>». الفورم جاهز للتالي — الفئة والأسعار والتفاصيل بقيوا متل ما هنّي.
        </p>
      )}
      <ProductEditorProvider key={run.key} categories={categories} initial={run.start} onCreated={onCreated}>
        <NewProductForm
          colours={colours}
          setColours={setColours}
          sizes={sizes}
          setSizes={setSizes}
          onNext={(v) => {
            next.current = v;
          }}
        />
      </ProductEditorProvider>
    </div>
  );
}

function NewProductForm({
  colours,
  setColours,
  sizes,
  setSizes,
  onNext,
}: {
  colours: Colour[];
  setColours: (c: Colour[]) => void;
  sizes: string[];
  setSizes: (s: string[]) => void;
  onNext: (next: boolean) => void;
}) {
  const { save, busy, error } = useProductEditor();
  const [adding, setAdding] = useState<Colour | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext(false);
        void save();
      }}
      className="space-y-8"
    >
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">الأساسيات</h2>
        <BasicsFields />
      </section>
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">الألوان والمقاسات</h2>
        <div className="space-y-2">
          <Label>الألوان</Label>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <span key={c.code} className="inline-flex items-center gap-2 border px-2 py-1 text-sm">
                <Swatch c={c} className="h-4 w-4" />
                <span dir="ltr">{c.name_en}</span>
                <button type="button" aria-label={`شيل ${c.name_en}`} onClick={() => setColours(colours.filter((x) => x.code !== c.code))}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="max-w-sm">
            <ColourPicker
              value={adding}
              onChange={(c) => {
                if (c && !colours.some((x) => x.code === c.code)) setColours([...colours, c]);
                setAdding(null);
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>المقاسات</Label>
          <SizePicker value={sizes} onChange={setSizes} />
        </div>
        <p className="text-xs text-muted-foreground">
          {colours.length && sizes.length
            ? `رح ينعمل ${colours.length * sizes.length} فاريانت (كل لون بكل مقاس)، والـSKU والباركود لحالهن.`
            : "اختياري هون — فيك تزيدهن بعدين من صفحة المنتج."}
        </p>
      </section>
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">التفاصيل</h2>
        <DetailsFields />
      </section>
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">Google (SEO)</h2>
        <SeoFields />
      </section>
      <p className="text-sm text-muted-foreground">الصور بتنزاد من صفحة المنتج بعد الإنشاء (أو بالجملة من «الصور»).</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "عم نحفظ…" : "احفظ وافتح المنتج"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            onNext(true);
            void save();
          }}
        >
          احفظ وزيد التالي
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </form>
  );
}
