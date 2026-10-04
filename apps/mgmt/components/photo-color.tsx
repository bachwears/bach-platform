"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { NOT_SAVED } from "../lib/access";
import { HintDot } from "@bach/ui/components/hint-dot";

/**
 * Which colour the product photos show. The storefront preselects that colour
 * and tells the shopper "Photos show …" when they pick another one.
 */
export function PhotoColor({
  productId,
  front,
  colors,
  initial,
}: {
  productId: string;
  front: string | null;
  colors: string[];
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save(next: string) {
    setValue(next);
    setMsg("");
    setErr("");
    const { data: changed, error } = await supabaseBrowser()
      .from("media_assets")
      .update({ color_en: next || null })
      .eq("product_id", productId)
      // only the four main photos; each extra colour keeps its own tag
      .in("kind", ["front", "back", "side", "closeup"])
      .select("id");
    if (error) setErr(`ما مشي الحفظ: ${error.message}`);
    else if (!changed?.length) setErr(NOT_SAVED);
    else setMsg("انحفظ.");
  }

  return (
    <div className="space-y-4 rounded-lg border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        لون الصور
        <HintDot
          hint={{
            title: "لون الصور",
            what: "أي لون ظاهر بالصور الأربعة الأساسية. صفحة المنتج بتفتح عليه، ولمّا الزبون يختار لون ما إلو صور بتكتبلو «Photos show …».",
            source: "من جدول media_assets (عمود color_en) للصور الأساسية الأربعة. صور الألوان التانية إلها لونها الخاص (تحت).",
            edit: "اختار اللون من هون. «غير محدد» = الصفحة بتختار أول لون متوفّر.",
          }}
        />
      </h2>
      <div className="flex items-center gap-4">
        {front ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={front} alt="" className="h-28 w-20 shrink-0 rounded-md bg-muted object-cover" />
        ) : (
          <div className="grid h-28 w-20 shrink-0 place-items-center rounded-md bg-muted text-xs text-muted-foreground">ما في صور</div>
        )}
        <div className="grid flex-1 gap-1.5">
          <label htmlFor="photo-color" className="text-sm font-medium">
            اللون يلّي بالصور
          </label>
          <select
            id="photo-color"
            dir="ltr"
            disabled={!front}
            value={value}
            onChange={(e) => void save(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">غير محدد</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      </div>
    </div>
  );
}
