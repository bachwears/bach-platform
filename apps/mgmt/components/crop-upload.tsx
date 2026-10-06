"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";

/**
 * One storefront image slot: pick a photo, slide the crop, save. The photo is
 * cut to the exact size the website shows (same maths as CSS object-fit:
 * cover), converted to WebP and stored under product-media/site; `onSaved`
 * then records the new address wherever it belongs (site_content, a table).
 */
export function CropUpload({
  label,
  ratio,
  width,
  height,
  current,
  fallback,
  fallbackNote,
  prefix,
  onSaved,
  onRemove,
}: {
  label: string;
  /** shown next to the label, e.g. "16:9" */
  ratio: string;
  width: number;
  height: number;
  current: string | null | undefined;
  /** what the website shows while this slot is empty */
  fallback?: string | null;
  fallbackNote?: string;
  /** file name start under product-media/site, e.g. "hero-m" */
  prefix: string;
  /** store the public URL; return an error message to show, or null */
  onSaved: (url: string) => Promise<string | null>;
  onRemove?: () => Promise<string | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [pos, setPos] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.url);
    },
    [draft],
  );

  const wider = draft ? draft.img.naturalWidth / draft.img.naturalHeight > width / height : true;
  const small = draft ? draft.img.naturalWidth < width * 0.6 || draft.img.naturalHeight < height * 0.6 : false;

  function pick(file: File) {
    setErr("");
    setMsg("");
    if (!file.type.startsWith("image/")) return setErr("اختار صورة (JPG / PNG / WebP).");
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
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const sw = width / scale;
    const sh = height / scale;
    const sx = wider ? ((img.naturalWidth - sw) * pos) / 100 : 0;
    const sy = wider ? 0 : ((img.naturalHeight - sh) * pos) / 100;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob) {
      setBusy(false);
      return setErr("ما قدرنا نحوّل الصورة.");
    }
    const supabase = supabaseBrowser();
    const path = `site/${prefix}-${Date.now()}.webp`;
    const up = await supabase.storage
      .from("product-media")
      .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (up.error) {
      setBusy(false);
      return setErr(`ما قدرنا نرفع الصورة: ${up.error.message}`);
    }
    const problem = await onSaved(supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl);
    setBusy(false);
    if (problem) return setErr(problem);
    setDraft(null);
    setMsg("انحفظت — بتبيّن عالموقع خلال دقيقة.");
  }

  async function remove() {
    if (!onRemove || !window.confirm(`أكيد بدك تشيل صورة «${label}»؟`)) return;
    setBusy(true);
    const problem = await onRemove();
    setBusy(false);
    if (problem) setErr(problem);
    else setMsg("انشالت.");
  }

  const shown = draft?.url ?? current ?? fallback ?? null;
  const objectPosition = draft ? (wider ? `${pos}% 50%` : `50% ${pos}%`) : "50% 30%";

  return (
    <div className="min-w-0 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        {label} <span className="text-muted-foreground" dir="ltr">({ratio})</span>
      </p>
      <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: `${width} / ${height}` }}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className={`h-full w-full object-cover ${!draft && !current ? "opacity-40 grayscale" : ""}`}
            style={{ objectPosition }}
          />
        ) : null}
        {!draft && !current && fallbackNote ? (
          <span className="absolute inset-x-2 bottom-2 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">{fallbackNote}</span>
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
              الصورة صغيرة ({draft.img.naturalWidth}×{draft.img.naturalHeight}) — رح تبيّن مش حادّة. الأفضل {width}×{height} أو أكبر.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              <Icon name="save" size={16} />
              {busy ? "عم نحفظ…" : "احفظ الصورة"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} />
            {current ? "بدّل الصورة" : "زيد صورة"}
          </Button>
          {current && onRemove ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
              <Icon name="remove" size={16} />
              شيل الصورة
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
