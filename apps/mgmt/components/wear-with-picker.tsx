"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Input } from "@bach/ui/components/input";

import { NOT_SAVED } from "../lib/access";

export interface PairedPiece {
  id: string;
  name_en: string;
  photo: string | null;
  price_usd_cents: number;
}

const MAX = 4;
const thumb = (url: string | null) => (url ? url.replace(/-1600\.webp$/, "-400.webp") : null);

/**
 * "Wear with" — 2 to 4 pieces shown under this product's photos on the site, each
 * with one-tap add. Without picks the site shows "Complete the look" from the
 * product's collection instead.
 */
export function WearWithPicker({ productId, initial }: { productId: string; initial: PairedPiece[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState(initial);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PairedPiece[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(text: string) {
    setQ(text);
    const term = text.trim().replace(/[,()%*\\]/g, " ").trim();
    if (term.length < 2) return setHits([]);
    const { data, error } = await supabaseBrowser()
      .from("products")
      .select("id, name_en, price_usd_cents, media_assets(kind, storage_path)")
      .eq("status", "published")
      .ilike("name_en", `%${term}%`)
      .neq("id", productId)
      .limit(10);
    if (error) return setErr(`ما مشي البحث: ${error.message}`);
    setHits(
      (data ?? [])
        .filter((p) => !picked.some((x) => x.id === p.id))
        .map((p) => ({
          id: p.id,
          name_en: p.name_en,
          price_usd_cents: p.price_usd_cents,
          photo:
            (p.media_assets as Array<{ kind: string; storage_path: string }> | null)?.find((m) => m.kind === "front")
              ?.storage_path ?? null,
        })),
    );
  }

  // the list is saved whole each time: delete then insert in the shown order
  async function save(next: PairedPiece[]) {
    setBusy(true);
    setErr("");
    const sb = supabaseBrowser();
    const { error: delErr } = await sb.from("product_pairings").delete().eq("product_id", productId);
    if (delErr) {
      setBusy(false);
      return setErr(`ما انحفظ: ${delErr.message}`);
    }
    if (next.length) {
      const { data, error } = await sb
        .from("product_pairings")
        .insert(next.map((p, i) => ({ product_id: productId, paired_id: p.id, sort: i })))
        .select("paired_id");
      if (error) {
        setBusy(false);
        return setErr(`ما انحفظ: ${error.message}`);
      }
      if (!data?.length) {
        setBusy(false);
        return setErr(NOT_SAVED);
      }
    }
    setPicked(next);
    setBusy(false);
    router.refresh();
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...picked];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    void save(next);
  };

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-destructive">{err}</p>}

      {picked.length ? (
        <ol className="space-y-2">
          {picked.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-md border p-2">
              {thumb(p.photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb(p.photo)!} alt="" className="h-14 w-11 rounded object-cover" />
              ) : (
                <span className="h-14 w-11 rounded bg-muted" />
              )}
              <span className="min-w-0 flex-1 text-sm" dir="ltr">
                <span className="block truncate">{p.name_en}</span>
                <span className="text-muted-foreground">${(p.price_usd_cents / 100).toFixed(0)}</span>
              </span>
              <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="h-9 w-9 rounded-md border text-sm disabled:opacity-30" aria-label="لفوق">
                ↑
              </button>
              <button type="button" disabled={busy || i === picked.length - 1} onClick={() => move(i, 1)} className="h-9 w-9 rounded-md border text-sm disabled:opacity-30" aria-label="لتحت">
                ↓
              </button>
              <button type="button" disabled={busy} onClick={() => void save(picked.filter((x) => x.id !== p.id))} className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50">
                شيل
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">ما في اختيارات بعد — الموقع عم يفرجي «Complete the look» من الكولكشن.</p>
      )}

      {picked.length < MAX ? (
        <div className="space-y-2">
          <Input value={q} onChange={(e) => void search(e.target.value)} placeholder="دوّر على قطعة بالاسم (بالإنكليزي)…" dir="ltr" />
          {hits.length ? (
            <ul className="divide-y rounded-md border">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setQ("");
                      setHits([]);
                      void save([...picked, h]);
                    }}
                    className="flex w-full items-center gap-3 p-2 text-start hover:bg-muted disabled:opacity-50"
                  >
                    {thumb(h.photo) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(h.photo)!} alt="" className="h-12 w-9 rounded object-cover" />
                    ) : (
                      <span className="h-12 w-9 rounded bg-muted" />
                    )}
                    <span className="flex-1 truncate text-sm" dir="ltr">
                      {h.name_en}
                    </span>
                    <span className="text-sm text-muted-foreground">+ زيد</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">وصلت للحد ({MAX} قطع). شيل وحدة لتزيد غيرها.</p>
      )}
    </div>
  );
}
