"use client";

import { useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Select } from "@bach/ui/components/select";

import { NOT_SAVED } from "../lib/access";
import { hiddenSort, nextShownSort, thumb, type MediaRow } from "./photo-tools";

interface Target {
  id: string;
  name_en: string;
  status: string;
  colours: string[];
  media: MediaRow[];
  front: string | null;
}

type ProductHit = {
  id: string;
  name_en: string;
  status: string;
  product_variants: Array<{ color_en: string | null; is_active: boolean }> | null;
  media_assets: MediaRow[] | null;
};

const SELECT = "id, name_en, status, product_variants(color_en, is_active), media_assets(id, kind, color_en, sort, storage_path)";

function toTarget(p: ProductHit): Target {
  const media = p.media_assets ?? [];
  return {
    id: p.id,
    name_en: p.name_en,
    status: p.status,
    colours: [...new Set((p.product_variants ?? []).map((v) => v.color_en).filter((c): c is string => !!c))].sort(),
    media,
    front: media.find((m) => m.kind === "front")?.storage_path ?? null,
  };
}

/**
 * Moves one photo row to another product (and colour). The file stays where it
 * is; only the row's product, colour, role and order change.
 */
export function PhotoMove({
  productId,
  photo,
  onDone,
  onCancel,
}: {
  productId: string;
  photo: MediaRow;
  onDone: (message: string, targetId: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [colour, setColour] = useState("");
  const [asMain, setAsMain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const seq = useRef(0);

  async function search(text: string) {
    setQ(text);
    setErr("");
    const term = text.trim().replace(/[,()%*\\]/g, " ").trim();
    if (term.length < 2) return setHits([]);
    const mine = ++seq.current;
    const sb = supabaseBrowser();
    const [byName, bySku] = await Promise.all([
      sb.from("products").select(SELECT).ilike("name_en", `%${term}%`).neq("id", productId).limit(8),
      sb.from("product_variants").select("product_id").ilike("sku", `%${term}%`).neq("product_id", productId).limit(30),
    ]);
    if (mine !== seq.current) return;
    if (byName.error) return setErr(`ما مشي البحث: ${byName.error.message}`);
    const found = (byName.data ?? []) as unknown as ProductHit[];
    const extraIds = [...new Set((bySku.data ?? []).map((v) => v.product_id as string))].filter((id) => !found.some((p) => p.id === id)).slice(0, 8);
    if (extraIds.length) {
      const { data } = await sb.from("products").select(SELECT).in("id", extraIds);
      if (mine !== seq.current) return;
      found.push(...((data ?? []) as unknown as ProductHit[]));
    }
    setHits(found.map(toTarget));
  }

  function pick(t: Target) {
    setTarget(t);
    setHits([]);
    setQ("");
    setColour(photo.color_en && t.colours.includes(photo.color_en) ? photo.color_en : t.colours[0] ?? "");
    setAsMain(!t.front);
  }

  async function move() {
    if (!target) return;
    const wasMain = photo.kind === "front";
    const warn = wasMain
      ? "هيدي الصورة الأساسية لهالمنتج. بعد النقل بيختفي عن الموقع لحدّ ما تختار صورة أساسية تانية. أكيد؟"
      : `انقل الصورة لـ ${target.name_en}؟`;
    if (!window.confirm(warn)) return;
    setBusy(true);
    setErr("");
    const main = asMain && !target.front;
    const color = colour || null;
    const { data, error } = await supabaseBrowser()
      .from("media_assets")
      .update({
        product_id: target.id,
        color_en: color,
        kind: main ? "front" : "other",
        sort: main ? 0 : color ? nextShownSort(target.media, color) : hiddenSort(0),
      })
      .eq("id", photo.id)
      .select("id");
    setBusy(false);
    if (error) return setErr(error.code === "23505" ? "المنتج التاني صار إلو صورة أساسية — جرّب بلا «خليها الأساسية»." : `ما مشي النقل: ${error.message}`);
    if (!data?.length) return setErr(NOT_SAVED);
    onDone(
      `انتقلت لـ ${target.name_en}${main ? " كصورة أساسية" : color ? ` (لون ${color})` : " بلا لون — ما بتبيّن هونيك لحدّ ما تحدّدلها لون"}.`,
      target.id,
    );
  }

  return (
    <div className="space-y-3 border border-dashed p-3">
      <p className="text-sm font-medium">انقل الصورة لمنتج تاني</p>
      {photo.kind === "front" ? (
        <p className="bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
          هيدي الصورة الأساسية لهالمنتج. إذا نقلتها، المنتج بيختفي عن الموقع إلا إذا خلّيت صورة تانية «أساسية».
        </p>
      ) : null}

      {target ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 border p-2">
            {target.front ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb(target.front)} alt="" className="h-12 w-9 object-cover" />
            ) : (
              <span className="h-12 w-9 bg-muted" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">
              {target.name_en}
            </span>
            <button type="button" className="text-xs underline underline-offset-2" onClick={() => setTarget(null)}>
              غيّر
            </button>
          </div>
          <div className="space-y-1">
            <label htmlFor={`move-colour-${photo.id}`} className="text-xs font-medium">
              أي لون هيدي الصورة بالمنتج التاني؟
            </label>
            <Select id={`move-colour-${photo.id}`} dir="ltr" value={colour} onChange={(e) => setColour(e.target.value)}>
              {target.colours.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">بلا لون</option>
            </Select>
          </div>
          {!target.front ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={asMain} onChange={(e) => setAsMain(e.target.checked)} />
              خليها الصورة الأساسية للمنتج التاني (ما إلو وحدة هلّق)
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void move()}>
              {busy ? "عم ننقل…" : "انقل"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input value={q} onChange={(e) => void search(e.target.value)} placeholder="دوّر بالاسم أو الـ SKU…" dir="ltr" autoFocus />
          {hits.length ? (
            <ul className="max-h-64 divide-y overflow-y-auto border">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => pick(h)} className="flex w-full items-center gap-3 p-2 text-start hover:bg-muted">
                    {h.front ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(h.front)} alt="" className="h-12 w-9 object-cover" />
                    ) : (
                      <span className="h-12 w-9 bg-muted" />
                    )}
                    <span className="min-w-0 flex-1" dir="ltr">
                      <span className="block truncate text-sm">{h.name_en}</span>
                      <span className="block truncate text-xs text-muted-foreground">{h.colours.join(" · ") || "—"}</span>
                    </span>
                    {h.status !== "published" ? <span className="text-xs text-muted-foreground">{h.status === "draft" ? "مسودة" : "مؤرشف"}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : q.trim().length >= 2 ? (
            <p className="text-xs text-muted-foreground">ما لقينا شي بهالاسم.</p>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      )}
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
