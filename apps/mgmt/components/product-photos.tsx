"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";

export interface ProductPhoto {
  kind: string;
  storage_path: string;
  color_en?: string | null;
}

const SLOTS = [
  { kind: "front", label: "أمامية", note: "الأساسية — بلاها المنتج مخفي عن الموقع" },
  { kind: "back", label: "خلفية", note: "بتبيّن لمّا الماوس يمرق عالكرت" },
  { kind: "side", label: "جانبية", note: "" },
  { kind: "closeup", label: "قريبة", note: "تفاصيل القماشة" },
] as const;
const SORT: Record<string, number> = { front: 0, back: 1, side: 2, closeup: 3 };
// Same renditions as the bulk photo import; the largest is what the storefront shows.
const RENDITIONS = [1600, 800, 400];

async function toWebp(bitmap: ImageBitmap, width: number): Promise<Blob> {
  const w = Math.min(width, bitmap.width);
  const h = Math.round((w / bitmap.width) * bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("webp encode failed"))), "image/webp", 0.82),
  );
}

/** The four product photo slots, editable in place on the product page. */
export function ProductPhotos({ productId, photos }: { productId: string; photos: ProductPhoto[] }) {
  // keep the photographed colour when a slot is replaced
  const color = photos.find((p) => p.kind === "front")?.color_en ?? photos.find((p) => p.color_en)?.color_en ?? null;
  return (
    <div id="photos" className="scroll-mt-24 space-y-4 rounded-lg border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        صور المنتج
        <HintDot
          hint={{
            title: "صور المنتج",
            what: "الصور الأربعة يلّي بتبيّن بصفحة المنتج بالموقع. الأمامية بتبيّن بالشوب، والخلفية لمّا الماوس يمرق عالكرت.",
            source: "جدول media_assets (صورة وحدة لكل نوع) — الملفات بـ product-media.",
            edit: "اكبس «زيد» أو «بدّل»، أو اسحب صورة فوق الخانة. منحوّلها لـ WebP تلقائياً. للتنزيل بالجملة استعمل صفحة الصور (SKU_front.jpg …).",
          }}
        />
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SLOTS.map((s) => (
          <Slot
            key={s.kind}
            productId={productId}
            kind={s.kind}
            label={s.label}
            note={s.note}
            color={color}
            current={photos.find((p) => p.kind === s.kind)?.storage_path ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function Slot({
  productId,
  kind,
  label,
  note,
  color,
  current,
}: {
  productId: string;
  kind: string;
  label: string;
  note: string;
  color: string | null;
  current: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setErr("اختار صورة (JPG / PNG / WebP).");
      return;
    }
    setBusy(true);
    setErr("");
    const supabase = supabaseBrowser();
    try {
      const bitmap = await createImageBitmap(file);
      // timestamped names: the public CDN caches files for a long time
      const base = `products/${productId}/${kind}-${Date.now()}`;
      let mainUrl = "";
      for (const w of RENDITIONS) {
        const blob = await toWebp(bitmap, w);
        const path = `${base}-${w}.webp`;
        const { error } = await supabase.storage
          .from("product-media")
          .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (error) throw new Error(error.message);
        if (w === RENDITIONS[0]) mainUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
      }
      bitmap.close();
      await supabase.from("media_assets").delete().eq("product_id", productId).eq("kind", kind);
      const { error: insErr } = await supabase.from("media_assets").insert({
        product_id: productId,
        kind,
        storage_path: mainUrl,
        sort: SORT[kind] ?? 9,
        ...(color ? { color_en: color } : {}),
      });
      if (insErr) throw new Error(insErr.message);
      router.refresh();
    } catch (e) {
      setErr(`ما مشي الرفع: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const warn =
      kind === "front"
        ? "إذا شلت الصورة الأمامية، المنتج بيختفي عن الموقع لحدّ ما تنزّل وحدة جديدة. أكيد؟"
        : `أكيد بدك تشيل الصورة ال${label}؟`;
    if (!window.confirm(warn)) return;
    setBusy(true);
    setErr("");
    const { error } = await supabaseBrowser().from("media_assets").delete().eq("product_id", productId).eq("kind", kind);
    setBusy(false);
    if (error) setErr(`ما مشي: ${error.message}`);
    else router.refresh();
  }

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs font-medium">
        {label}
        {kind === "front" ? <span className="text-red-600 dark:text-red-400"> *</span> : null}
      </p>
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-md border bg-muted ${
          over ? "ring-2 ring-foreground" : ""
        } ${!current && kind === "front" ? "border-dashed border-red-500/60" : !current ? "border-dashed" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void upload(f);
        }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-3 text-center text-[11px] text-muted-foreground">
            {busy ? "عم نرفع…" : "اسحب صورة لهون"}
          </span>
        )}
        {busy && current ? (
          <span className="absolute inset-0 grid place-items-center bg-background/70 text-xs">عم نرفع…</span>
        ) : null}
      </div>
      {note ? <p className="text-[11px] leading-snug text-muted-foreground">{note}</p> : null}
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          {current ? "بدّل" : "زيد"}
        </Button>
        {current ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
            شيل
          </Button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
