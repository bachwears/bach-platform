"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { NOT_SAVED } from "../lib/access";
import { HintDot } from "@bach/ui/components/hint-dot";

interface Photo {
  id: string;
  kind: string;
  storage_path: string;
  color_en?: string | null;
  sort: number | null;
}

// Same window the storefront reads: extra photos with 100 ≤ sort < 500 are on the site.
const shown = (sort: number | null) => sort != null && sort >= 100 && sort < 500;

/**
 * Extra photos grouped by the colour they show. Each colour with shown photos
 * gets its own gallery on the product page when the shopper picks that colour.
 */
export function ColourPhotos({ photos, heroColor }: { photos: Photo[]; heroColor: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const extras = photos.filter((p) => p.kind === "other");
  if (!extras.length) return null;

  const groups = new Map<string, Photo[]>();
  for (const p of [...extras].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))) {
    const key = p.color_en ?? "";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const order = [...groups.keys()].sort((a, b) =>
    a === heroColor ? -1 : b === heroColor ? 1 : a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  async function toggle(p: Photo) {
    setBusy(p.id);
    setErr("");
    const group = groups.get(p.color_en ?? "") ?? [];
    // showing appends after the colour's shown photos; hiding parks it in the 500+ range
    const next = shown(p.sort)
      ? 500 + ((p.sort ?? 0) % 100)
      : Math.min(499, Math.max(199, ...group.filter((g) => shown(g.sort)).map((g) => g.sort ?? 0)) + 1);
    const { data: changed, error } = await supabaseBrowser().from("media_assets").update({ sort: next }).eq("id", p.id).select("id");
    setBusy(null);
    if (error) setErr(`ما مشي التغيير: ${error.message}`);
    else if (!changed?.length) setErr(NOT_SAVED);
    else router.refresh();
  }

  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        صور الألوان
        <HintDot
          hint={{
            title: "صور الألوان",
            what: "صور زيادة مرتّبة حسب اللون الظاهر فيها. لمّا الزبون يختار لون إلو صور «ظاهرة»، صفحة المنتج بتبدّل الصور لصور هاللون.",
            source: "جدول media_assets (نوع other، عمود color_en). الصور بتنزل من صفحة الصور بالجملة باسم مثل BW-SWT-109-NAV_front.jpg.",
            edit: "اكبس «خبّي» أو «ورجي» تحت كل صورة. «لون مش معروف» = صور ما منعرف لونها أو لون مش منبيعو — ما بتبيّن بالموقع.",
          }}
        />
      </h2>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {order.map((key) => {
        const list = groups.get(key)!;
        const live = list.filter((p) => shown(p.sort) && key).length;
        return (
          <section key={key || "none"} className="space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium" dir="ltr">
                {key || "لون مش معروف"}
              </span>
              {key === heroColor && <Badge variant="outline">لون الصور الأساسية</Badge>}
              <span className="text-muted-foreground">
                {live} ظاهرة من {list.length}
              </span>
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {list.map((p) => (
                <li key={p.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.storage_path}
                    alt=""
                    loading="lazy"
                    className={`aspect-[3/4] w-full rounded-md bg-muted object-cover ${shown(p.sort) && key ? "" : "opacity-40"}`}
                  />
                  {key ? (
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => void toggle(p)}
                      className="w-full rounded-md border py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      {shown(p.sort) ? "خبّي" : "ورجي"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
