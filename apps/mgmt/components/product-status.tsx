"use client";

import { Printer } from "lucide-react";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";

import { useProductEditor } from "./product-form";
import { thumb } from "./photo-tools";

const STATUS: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "منشور", variant: "success" },
  draft: { label: "مسودة", variant: "secondary" },
  archived: { label: "مؤرشف", variant: "outline" },
};

export const PRODUCT_SECTIONS: Array<[string, string]> = [
  ["overview", "الحالة"],
  ["basics", "الأساسيات"],
  ["photos", "الصور"],
  ["variants", "الألوان والمقاسات"],
  ["details", "التفاصيل"],
  ["wear-with", "البسها مع"],
  ["seo", "SEO"],
];

export interface SavedState {
  id: string;
  name: string;
  slug: string;
  status: string;
  front: string | null;
  priceCents: number;
  saleCents: number | null;
  /** sellable units across branches (quantity − reserved) */
  stock: number;
  activeVariants: number;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** Why the product is (not) on bachwears.com right now, from what is saved. */
export function visibility(s: SavedState): { visible: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (s.status === "draft") blockers.push("مسودة — غيّر الحالة لـ «منشور»");
  if (s.status === "archived") blockers.push("مؤرشف");
  if (!s.front) blockers.push("ما إلو صورة أساسية (قدّام)");
  if (!s.activeVariants) warnings.push("ما في مقاسات فعّالة — ما حدا فيه يطلبو");
  else if (s.stock <= 0) warnings.push("خالص من الستوك — بيبيّن «Sold out»");
  return { visible: !blockers.length, blockers, warnings };
}

/** Sticky bar under the nav: the product at a glance, jump links and the save button. */
export function ProductStatusBar({ saved }: { saved: SavedState }) {
  const { save, busy, dirty, error, saved: justSaved } = useProductEditor();
  const st = STATUS[saved.status] ?? { label: saved.status, variant: "outline" as const };
  const { visible, blockers } = visibility(saved);
  const onSale = saved.saleCents != null && saved.saleCents < saved.priceCents;

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b bg-background px-4 pb-2 pt-3 sm:mx-0">
      <div className="flex items-center gap-3">
        {saved.front ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(saved.front)} alt="" className="h-12 w-9 shrink-0 bg-muted object-cover" />
        ) : (
          <span className="h-12 w-9 shrink-0 border border-dashed border-red-500/60 bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium sm:text-lg" dir="ltr">
            {saved.name}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Badge variant={st.variant}>{st.label}</Badge>
            <span className={visible ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
              {visible ? "ظاهر عالموقع" : `مخفي: ${blockers[0]}`}
            </span>
            <span dir="ltr" className="tabular-nums">
              {onSale ? (
                <>
                  <span className="line-through">{usd(saved.priceCents)}</span> {usd(saved.saleCents!)}
                </>
              ) : (
                usd(saved.priceCents)
              )}
            </span>
            <span className="tabular-nums">ستوك: {saved.stock}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/labels?product=${saved.id}`}
            title="اطبع ليبلات هالمنتج"
            aria-label="اطبع ليبل"
            className="inline-flex h-9 items-center gap-1.5 border px-3 text-sm hover:bg-muted"
          >
            <Printer className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">اطبع ليبل</span>
          </a>
          <a
            href={`https://bachwears.com/products/${saved.slug}`}
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 items-center border px-3 text-sm hover:bg-muted sm:inline-flex"
          >
            شوف عالموقع
          </a>
          <Button type="button" disabled={busy || !dirty} onClick={() => void save()} variant={dirty ? "default" : "outline"}>
            {busy ? "عم نحفظ…" : dirty ? "احفظ" : justSaved ? "انحفظ ✓" : "محفوظ"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <nav aria-label="أقسام المنتج" className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
        {PRODUCT_SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 border px-3 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            {label}
          </a>
        ))}
        <a
          href={`https://bachwears.com/products/${saved.slug}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 border px-3 py-1 text-muted-foreground hover:bg-muted sm:hidden"
        >
          شوف عالموقع
        </a>
      </nav>
    </div>
  );
}

export interface PhotoFacts {
  hasFront: boolean;
  hasBack: boolean;
  /** active colours with no photo on the site */
  coloursWithoutPhotos: string[];
  colourCount: number;
}

/** Status at a glance + what this product still misses (text fields update live). */
export function ProductOverview({ saved, photos }: { saved: SavedState; photos: PhotoFacts }) {
  const { values } = useProductEditor();
  const { visible, blockers, warnings } = visibility(saved);
  const items: Array<{ ok: boolean; label: string; href: string; note?: string }> = [
    { ok: photos.hasFront, label: "صورة أساسية (قدّام)", href: "#photos", note: "بلاها المنتج مخفي عن الموقع" },
    { ok: photos.hasBack, label: "صورة ضهر", href: "#photos", note: "بتبيّن لمّا الماوس يمرق عالكرت" },
    {
      ok: photos.colourCount > 0 && !photos.coloursWithoutPhotos.length,
      label: "صور لكل لون",
      href: "#photos",
      note: photos.colourCount === 0 ? "ما في ألوان بعد" : photos.coloursWithoutPhotos.length ? `ناقص: ${photos.coloursWithoutPhotos.join("، ")}` : undefined,
    },
    { ok: !!values.description_en.trim(), label: "الوصف", href: "#details" },
    { ok: !!values.material_en.trim(), label: "الخامة", href: "#details" },
    { ok: !!values.care_en.trim(), label: "العناية", href: "#details" },
    { ok: !!values.cost_usd.trim(), label: "سعر الكلفة", href: "#basics" },
    { ok: !!values.seasons.split(",").filter(Boolean).length, label: "المواسم", href: "#details" },
  ];
  const done = items.filter((i) => i.ok).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div
          role={visible ? undefined : "alert"}
          className={`border p-4 text-sm ${
            visible ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <p className={`font-medium ${visible ? "text-emerald-800 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
            {visible ? "المنتج ظاهر عالموقع" : "المنتج مخفي عن الموقع"}
          </p>
          {blockers.length ? (
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {warnings.length ? (
            <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-400">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {visible ? (
            <a href={`https://bachwears.com/products/${saved.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-2">
              شوف عالموقع
            </a>
          ) : null}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="border p-3">
            <dt className="text-xs text-muted-foreground">السعر</dt>
            <dd className="mt-1 font-medium tabular-nums" dir="ltr">
              {usd(saved.saleCents != null && saved.saleCents < saved.priceCents ? saved.saleCents : saved.priceCents)}
            </dd>
          </div>
          <div className="border p-3">
            <dt className="text-xs text-muted-foreground">الستوك</dt>
            <dd className={`mt-1 font-medium tabular-nums ${saved.stock <= 0 ? "text-red-700 dark:text-red-400" : ""}`}>{saved.stock}</dd>
          </div>
          <div className="border p-3">
            <dt className="text-xs text-muted-foreground">الألوان</dt>
            <dd className="mt-1 font-medium tabular-nums">{photos.colourCount}</dd>
          </div>
        </dl>
      </div>

      <div className="border p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          شو ناقص
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {done} من {items.length} جاهز
          </span>
          <HintDot
            hint={{
              title: "شو ناقص",
              what: "لائحة الأشيا يلّي بتخلّي صفحة المنتج كاملة عالموقع. الصورة الأساسية بس إجبارية للظهور؛ الباقي بيحسّن البيع وغوغل.",
              source: "من بيانات هالمنتج: الصور (media_assets)، الألوان (product_variants)، والحقول تحت.",
              edit: "اكبس على أي بند لتنزل عالقسم تبعو. الحقول النصيّة بتتحدّث هون وإنت عم تكتب.",
            }}
          />
        </p>
        <div className="mt-2 h-1.5 overflow-hidden bg-muted">
          <div className="h-full bg-foreground transition-[width]" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.label}>
              <a href={i.href} className="flex items-start gap-2 p-1.5 text-sm hover:bg-muted">
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${
                    i.ok ? "bg-foreground text-background" : "border border-amber-500 text-amber-600"
                  }`}
                >
                  {i.ok ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className={i.ok ? "text-muted-foreground" : ""}>{i.label}</span>
                  {!i.ok && i.note ? <span className="block text-xs text-muted-foreground">{i.note}</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
