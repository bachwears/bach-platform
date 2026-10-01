"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";

export interface CategoryImageRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  productCount: number;
  banner_url: string | null;
  banner_mobile_url: string | null;
}

type Slot = "desktop" | "mobile";

// What the storefront shows: a wide 21:9 header on desktop, a 4:5 portrait on phones.
const TARGET: Record<Slot, { w: number; h: number; column: "banner_url" | "banner_mobile_url"; label: string; ratio: string }> = {
  desktop: { w: 2560, h: 1097, column: "banner_url", label: "الكمبيوتر", ratio: "21:9" },
  mobile: { w: 1080, h: 1350, column: "banner_mobile_url", label: "الموبايل", ratio: "4:5" },
};

/** Every category's header image, with its parent's as the visible fallback. */
export function CategoryImages({ categories }: { categories: CategoryImageRow[] }) {
  const parents = categories.filter((c) => !c.parent_id);
  return (
    <div className="space-y-10">
      {parents.map((p) => (
        <section key={p.id} className="space-y-3">
          <CategoryCard row={p} />
          <div className="space-y-3 border-s-2 ps-4">
            {categories
              .filter((c) => c.parent_id === p.id)
              .map((c) => (
                <CategoryCard key={c.id} row={c} parent={p} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CategoryCard({ row, parent }: { row: CategoryImageRow; parent?: CategoryImageRow }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {row.name_ar}
          <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
            {row.name_en} · {row.code}
          </span>
        </p>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          {row.productCount} منتج
          <a
            href={`https://bachwears.com/shop?cat=${row.code}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            شوف عالموقع
          </a>
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <ImageSlot row={row} slot="desktop" inherited={parent?.banner_url ?? null} />
        <ImageSlot
          row={row}
          slot="mobile"
          inherited={parent ? (parent.banner_mobile_url ?? parent.banner_url) : null}
          ownDesktop={row.banner_url}
        />
      </div>
    </div>
  );
}

function ImageSlot({
  row,
  slot,
  inherited,
  ownDesktop,
}: {
  row: CategoryImageRow;
  slot: Slot;
  inherited: string | null;
  ownDesktop?: string | null;
}) {
  const router = useRouter();
  const target = TARGET[slot];
  const current = row[target.column];
  // what a shopper sees today when this slot is empty
  const fallback = !current ? (slot === "mobile" && ownDesktop ? ownDesktop : inherited) : null;
  const fallbackNote =
    slot === "mobile" && ownDesktop && !current
      ? "فاضية — الموبايل عم يقصّ صورة الكمبيوتر"
      : inherited && !current
        ? "فاضية — عم تبيّن صورة الفئة الأم"
        : !current
          ? "فاضية — ما في صورة هيدر"
          : null;

  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [pos, setPos] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => () => {
    if (draft) URL.revokeObjectURL(draft.url);
  }, [draft]);

  // Which axis the crop slides on: a source wider than the target crops sideways.
  const wider = draft ? draft.img.naturalWidth / draft.img.naturalHeight > target.w / target.h : true;
  const small = draft ? draft.img.naturalWidth < target.w * 0.6 || draft.img.naturalHeight < target.h * 0.6 : false;

  function pick(file: File) {
    setErr("");
    setMsg("");
    if (!file.type.startsWith("image/")) {
      setErr("اختار صورة (JPG / PNG / WebP).");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPos(50);
      setDraft({ url, img });
    };
    img.onerror = () => setErr("ما قدرنا نقرا هالصورة.");
    img.src = url;
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr("");
    const { img } = draft;
    // Same maths as CSS object-fit: cover + object-position, so the saved crop matches the preview.
    const scale = Math.max(target.w / img.naturalWidth, target.h / img.naturalHeight);
    const sw = target.w / scale;
    const sh = target.h / scale;
    const sx = wider ? ((img.naturalWidth - sw) * pos) / 100 : 0;
    const sy = wider ? 0 : ((img.naturalHeight - sh) * pos) / 100;
    const canvas = document.createElement("canvas");
    canvas.width = target.w;
    canvas.height = target.h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.w, target.h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob) {
      setBusy(false);
      setErr("ما قدرنا نحوّل الصورة.");
      return;
    }
    const supabase = supabaseBrowser();
    const path = `site/cat-${row.code}-${slot === "desktop" ? "d" : "m"}-${Date.now()}.webp`;
    const up = await supabase.storage
      .from("product-media")
      .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (up.error) {
      setBusy(false);
      setErr(`ما قدرنا نرفع الصورة: ${up.error.message}`);
      return;
    }
    const publicUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase
      .from("categories")
      .update({ [target.column]: publicUrl })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      setErr(`ما مشي الحفظ: ${error.message}`);
      return;
    }
    setDraft(null);
    setMsg("انحفظت — بتبيّن عالموقع فوراً.");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`أكيد بدك تشيل صورة ${target.label} لـ ${row.name_ar}؟`)) return;
    setBusy(true);
    setErr("");
    const { error } = await supabaseBrowser()
      .from("categories")
      .update({ [target.column]: null })
      .eq("id", row.id);
    setBusy(false);
    if (error) setErr(`ما مشي: ${error.message}`);
    else {
      setMsg("انشالت.");
      router.refresh();
    }
  }

  const shown = draft?.url ?? current ?? fallback;
  const objectPosition = draft ? (wider ? `${pos}% 50%` : `50% ${pos}%`) : "50% 30%";

  return (
    <div className="min-w-0 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        {target.label} <span className="text-muted-foreground" dir="ltr">({target.ratio})</span>
        {slot === "desktop" ? (
          <HintDot
            hint={{
              title: "صورة هيدر الفئة",
              what: "الصورة العريضة فوق صفحة الفئة بالموقع (الكمبيوتر 21:9، الموبايل 4:5). الفئة الفرعية يلّي ما إلها صورة بتاخد صورة الفئة الأم.",
              source: "جدول categories — banner_url (كمبيوتر) و banner_mobile_url (موبايل). الصور بتنحفظ بـ product-media/site.",
              edit: "اختار صورة، حرّك المؤشر لتختار القصّة، واحفظ. منحوّلها لـ WebP وبالقياس الصح تلقائياً.",
            }}
          />
        ) : null}
      </p>
      <div
        className={`relative overflow-hidden rounded-md bg-muted ${slot === "desktop" ? "aspect-[21/9]" : "aspect-[4/5]"}`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className={`h-full w-full object-cover ${!draft && !current ? "opacity-40 grayscale" : ""}`}
            style={{ objectPosition }}
          />
        ) : null}
        {fallbackNote && !draft ? (
          <span className="absolute inset-x-2 bottom-2 rounded bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
            {fallbackNote}
          </span>
        ) : null}
      </div>

      {draft ? (
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">
            {wider ? "حرّك القصّة يمين / شمال" : "حرّك القصّة فوق / تحت"}
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              className="mt-1 block w-full accent-foreground"
            />
          </label>
          {small ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              الصورة صغيرة ({draft.img.naturalWidth}×{draft.img.naturalHeight}) — رح تبيّن مش حادّة. الأفضل {target.w}×{target.h} أو أكبر.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? "عم نحفظ…" : "احفظ"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {current ? "بدّل الصورة" : "زيد صورة"}
          </Button>
          {current ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
              شيل
            </Button>
          ) : null}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
