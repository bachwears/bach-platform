"use client";

import { useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";

const RENDITIONS = [1600, 800, 400];
// {CODE}_{view}[-n].jpg — view words the photo team uses, mapped to the gallery slots:
// front / back = product only (listing + hover), model = worn, model-zoom = worn close.
// side / closeup are the older names for model / model-zoom and still work.
const FILE_RE = /^(.+)_(front|back|model-zoom|model|side|closeup|detail)(?:-(\d+))?\.(jpe?g|png|webp)$/i;
const VIEW_KIND: Record<string, string> = {
  front: "front",
  back: "back",
  model: "side",
  side: "side",
  "model-zoom": "closeup",
  closeup: "closeup",
};
const VIEW_SORT: Record<string, number> = { front: 0, back: 1, model: 2, side: 2, "model-zoom": 3, closeup: 3, detail: 4 };

interface FileResult {
  name: string;
  status: "ok" | "unmatched-name" | "unknown-sku" | "error";
  detail?: string;
}

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

export function MediaImport() {
  const supabase = supabaseBrowser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<FileResult[]>([]);
  const [replaceAll, setReplaceAll] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setResults([]);
    const out: FileResult[] = [];

    // Parse names first, resolve every code → product from one variant list.
    const parsed = Array.from(files)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => {
        const m = FILE_RE.exec(f.name);
        return m && m[1] && m[2]
          ? { file: f, sku: m[1].toUpperCase(), view: m[2].toLowerCase(), n: m[3] ? Number(m[3]) : 1 }
          : { file: f, sku: null, view: null, n: 1 };
      });
    // A file may be named by the product base (BW-SWT-109), base + colour
    // (BW-SWT-109-LGR — preferred: it also records which colour the photos
    // show) or a full variant SKU (BW-SWT-109-LGR-XL). Variant SKUs are
    // BW-{CAT}-{SEQ}-{COLOR}-{SIZE}, so all three resolve from one variant list.
    // paged: the API returns at most 1000 rows per request and there are more variants than that
    const variants: Array<{ sku: string | null; product_id: string; color_en: string | null }> = [];
    for (let from = 0; ; from += 1000) {
      const { data: page } = await supabase
        .from("product_variants")
        .select("sku, product_id, color_en")
        .order("sku")
        .range(from, from + 999);
      variants.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    type Hit = { productId: string; color: string | null };
    const lookup = new Map<string, Hit>();
    for (const v of variants) {
      if (!v.sku) continue;
      const parts = v.sku.toUpperCase().split("-");
      lookup.set(parts.join("-"), { productId: v.product_id, color: v.color_en });
      if (parts.length >= 5) {
        lookup.set(parts.slice(0, 4).join("-"), { productId: v.product_id, color: v.color_en });
        if (!lookup.has(parts.slice(0, 3).join("-"))) {
          lookup.set(parts.slice(0, 3).join("-"), { productId: v.product_id, color: null });
        }
      }
    }

    // One colour per product owns the four gallery slots (the hero). It stays the
    // colour already on the front photo; a product without one (or a full replace)
    // takes the colour of its first _front file. Every other colour's photos are
    // kept as extra photos tagged with their colour.
    const touched = new Set<string>();
    for (const p of parsed) {
      const hit = p.sku ? lookup.get(p.sku) : undefined;
      if (hit) touched.add(hit.productId);
    }
    const hero = new Map<string, string | null>();
    if (!replaceAll && touched.size) {
      const { data: fronts } = await supabase
        .from("media_assets")
        .select("product_id, color_en")
        .eq("kind", "front")
        .in("product_id", [...touched]);
      for (const f of fronts ?? []) hero.set(f.product_id, f.color_en);
    }
    for (const p of parsed) {
      const hit = p.sku ? lookup.get(p.sku) : undefined;
      if (hit && p.view === "front" && p.n === 1 && !hero.has(hit.productId)) hero.set(hit.productId, hit.color);
    }
    if (replaceAll) {
      for (const id of touched) await supabase.from("media_assets").delete().eq("product_id", id);
    }

    let done = 0;
    for (const p of parsed) {
      done += 1;
      setProgress(`${done} / ${parsed.length} — ${p.file.name}`);
      if (!p.sku || !p.view) {
        out.push({ name: p.file.name, status: "unmatched-name", detail: "الاسم لازم يكون مثلاً BW-SWT-109-LGR_front.jpg" });
        continue;
      }
      const hit = lookup.get(p.sku);
      if (!hit) {
        out.push({ name: p.file.name, status: "unknown-sku", detail: `ما في منتج بالكود ${p.sku}` });
        continue;
      }
      const productId = hit.productId;
      const heroColor = hero.get(productId);
      const isHero = heroColor === undefined || heroColor === null || hit.color === null || hit.color === heroColor;
      const slot = VIEW_KIND[p.view];
      const kind = slot && p.n === 1 && isHero ? slot : "other";
      const tag = p.n > 1 ? `${p.view}-${p.n}` : p.view;
      try {
        const bitmap = await createImageBitmap(p.file);
        const stamp = Date.now();
        let mainUrl = "";
        for (const w of RENDITIONS) {
          const blob = await toWebp(bitmap, w);
          // timestamped: the public CDN would otherwise keep serving a replaced photo
          const path = `${p.sku}/${tag}-${stamp}-${w}.webp`;
          const { error: upErr } = await supabase.storage
            .from("product-media")
            .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
          if (upErr) throw new Error(upErr.message);
          if (w === RENDITIONS[0]) {
            mainUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
          }
        }
        bitmap.close();
        // re-uploading the same file name replaces that photo instead of adding a copy
        await supabase.from("media_assets").delete().eq("product_id", productId).like("storage_path", `%/${p.sku}/${tag}-%`);
        if (kind !== "other") await supabase.from("media_assets").delete().eq("product_id", productId).eq("kind", kind);
        const { error: insErr } = await supabase.from("media_assets").insert({
          product_id: productId,
          kind,
          storage_path: mainUrl,
          sort: kind === "other" ? 100 + (VIEW_SORT[p.view] ?? 5) * 10 + p.n : (VIEW_SORT[p.view] ?? 9),
          // the colour code in the file name says which colour the photos show
          ...(hit.color ? { color_en: hit.color } : {}),
        });
        if (insErr) throw new Error(insErr.message);
        out.push({ name: p.file.name, status: "ok" });
      } catch (e) {
        out.push({ name: p.file.name, status: "error", detail: e instanceof Error ? e.message : String(e) });
      }
    }
    setResults(out);
    setProgress("");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const ok = results.filter((r) => r.status === "ok").length;

  return (
    <div className="space-y-4">
      <label
        className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="font-medium">اسحب الصور لهون أو دوس لتختار</p>
        <p className="text-sm text-muted-foreground" dir="ltr">
          BW-SWT-109-LGR_front.jpg · _back · _model · _model-zoom · _model-2 · _detail
        </p>
        <p className="text-xs text-muted-foreground">
          الاسم = كود المنتج + كود اللون الظاهر بالصورة + نوع الصورة. front / back = القطعة لحالها (قدّام / ورا)، model = ع الموديل، model-zoom = ع الموديل عن قرب. منعمل تحويل WebP و٣ قياسات (1600 / 800 / 400) بالمتصفح قبل الرفع.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={replaceAll}
          disabled={busy}
          onChange={(e) => setReplaceAll(e.target.checked)}
        />
        استبدل كل الصور القديمة للمنتجات يلي بهالدفعة (الصور القديمة بتنمسح، مش بس يلي إلها نفس الاسم)
      </label>

      {busy && <p className="text-sm text-muted-foreground">عم نرفع… {progress}</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            خلصنا: {ok} من {results.length} انرفعت.
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-3 text-sm">
            {results.map((r, i) => (
              <li key={i} className={r.status === "ok" ? "text-muted-foreground" : "text-destructive"}>
                <span dir="ltr">{r.name}</span>
                {r.status === "ok" ? " ✓" : ` — ${r.detail}`}
              </li>
            ))}
          </ul>
          {results.some((r) => r.status !== "ok") && (
            <Button variant="outline" size="sm" onClick={() => setResults([])}>
              مسح النتائج
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
