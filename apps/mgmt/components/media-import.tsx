"use client";

import { useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";

const KINDS = ["front", "back", "side", "closeup"] as const;
const KIND_SORT: Record<string, number> = { front: 0, back: 1, side: 2, closeup: 3 };
const RENDITIONS = [1600, 800, 400];
const FILE_RE = /^(.+)_(front|back|side|closeup)\.(jpe?g|png|webp)$/i;

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

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setResults([]);
    const out: FileResult[] = [];

    // Parse names first, resolve every SKU → product in one query.
    const parsed = Array.from(files).map((f) => {
      const m = FILE_RE.exec(f.name);
      return m && m[1] && m[2]
        ? { file: f, sku: m[1], kind: m[2].toLowerCase() }
        : { file: f, sku: null, kind: null };
    });
    const skus = [...new Set(parsed.filter((p) => p.sku).map((p) => p.sku!))];
    const { data: variants } = await supabase
      .from("product_variants")
      .select("sku, product_id")
      .in("sku", skus);
    const skuToProduct = new Map((variants ?? []).map((v) => [v.sku, v.product_id]));

    let done = 0;
    for (const p of parsed) {
      done += 1;
      setProgress(`${done} / ${parsed.length} — ${p.file.name}`);
      if (!p.sku || !p.kind) {
        out.push({ name: p.file.name, status: "unmatched-name", detail: "الاسم لازم يكون SKU_front.jpg مثلاً" });
        continue;
      }
      const productId = skuToProduct.get(p.sku);
      if (!productId) {
        out.push({ name: p.file.name, status: "unknown-sku", detail: `ما في فاريانت بالرقم ${p.sku}` });
        continue;
      }
      try {
        const bitmap = await createImageBitmap(p.file);
        let mainUrl = "";
        for (const w of RENDITIONS) {
          const blob = await toWebp(bitmap, w);
          const path = `${p.sku}/${p.kind}-${w}.webp`;
          const { error: upErr } = await supabase.storage
            .from("product-media")
            .upload(path, blob, { upsert: true, contentType: "image/webp" });
          if (upErr) throw new Error(upErr.message);
          if (w === RENDITIONS[0]) {
            mainUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
          }
        }
        bitmap.close();
        await supabase.from("media_assets").delete().eq("product_id", productId).eq("kind", p.kind);
        const { error: insErr } = await supabase.from("media_assets").insert({
          product_id: productId,
          kind: p.kind,
          storage_path: mainUrl,
          sort: KIND_SORT[p.kind] ?? 9,
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
          BW-HOD-001_front.jpg · _back · _side · _closeup
        </p>
        <p className="text-xs text-muted-foreground">
          منعمل تحويل WebP و٣ قياسات (1600 / 800 / 400) بالمتصفح قبل الرفع.
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
