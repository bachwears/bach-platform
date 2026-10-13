"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { EmptyState } from "@bach/ui/components/empty-state";
import { Icon } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";

import { outfitHealth, outfitPrice, usd, type OutfitPriceKind } from "../lib/outfit-price";

export const OUTFIT_STATUS: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "منشور", variant: "success" },
  draft: { label: "مسودة", variant: "secondary" },
  archived: { label: "مؤرشف", variant: "outline" },
};
export const SELL_MODE_LABEL: Record<string, string> = {
  flexible: "مرن",
  whole: "الطقم كامل بس",
  exclusive: "ما بتنباع إلا مع بعض",
};

type Level = { quantity: number; reserved: number };
type Piece = {
  product_id: string;
  products: {
    name_en: string;
    status: string;
    price_usd_cents: number;
    sale_price_usd_cents: number | null;
    media_assets: Array<{ kind: string }> | null;
    product_variants: Array<{ is_active: boolean; inventory_levels: Level[] | null }> | null;
  } | null;
};
export interface OutfitRow {
  id: string;
  slug: string;
  name_en: string;
  status: string;
  sell_mode: string;
  price_kind: OutfitPriceKind;
  percent_off: number | null;
  fixed_usd_cents: number | null;
  outfit_media: Array<{ storage_path: string; is_main: boolean; sort: number }> | null;
  outfit_items: Piece[] | null;
}

export const OUTFIT_SELECT =
  "id, slug, name_en, status, sell_mode, price_kind, percent_off, fixed_usd_cents, outfit_media(storage_path, is_main, sort), outfit_items(product_id, products(name_en, status, price_usd_cents, sale_price_usd_cents, media_assets(kind), product_variants(is_active, inventory_levels(quantity, reserved))))";

/** Sellable units of a product (active variants, all branches). */
export const stockOf = (vs: Piece["products"] extends infer P ? (P extends { product_variants: infer V } ? V : never) : never) =>
  ((vs ?? []) as Array<{ is_active: boolean; inventory_levels: Level[] | null }>)
    .filter((v) => v.is_active)
    .reduce((n, v) => n + (v.inventory_levels ?? []).reduce((m, l) => m + l.quantity - l.reserved, 0), 0);

export function summarise(o: OutfitRow) {
  const pieces = (o.outfit_items ?? []).filter((i) => i.products);
  const price = outfitPrice(
    pieces.map((i) => ({
      current: Math.min(i.products!.sale_price_usd_cents ?? i.products!.price_usd_cents, i.products!.price_usd_cents),
      full: i.products!.price_usd_cents,
    })),
    o.price_kind,
    o.percent_off,
    o.fixed_usd_cents,
  );
  const health = outfitHealth(
    pieces.map((i) => ({
      name: i.products!.name_en,
      status: i.products!.status,
      hasFront: (i.products!.media_assets ?? []).some((m) => m.kind === "front"),
      stock: stockOf(i.products!.product_variants),
    })),
  );
  const media = [...(o.outfit_media ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort - b.sort);
  return { pieces: pieces.length, price, health, photo: media[0]?.storage_path ?? null };
}

/** MGMT → الأطقم: every outfit with its price and whether it can sell right now. */
export function OutfitsList() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [rows, setRows] = useState<OutfitRow[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabase
      .from("outfits")
      .select(OUTFIT_SELECT)
      .order("sort")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setRows((data ?? []) as unknown as OutfitRow[]);
      });
  }, [supabase]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !s || r.name_en.toLowerCase().includes(s) || r.slug.includes(s));
  }, [rows, q]);

  async function create() {
    setBusy(true);
    setErr("");
    const stamp = Date.now().toString(36);
    const { data, error } = await supabase
      .from("outfits")
      .insert({ slug: `look-${stamp}`, name_en: "New look", name_ar: "طقم جديد" })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return setErr(`ما انعمل الطقم: ${error?.message ?? ""}`);
    router.push(`/outfits/${data.id}`);
  }

  if (!rows) return <p className="text-sm text-muted-foreground">عم نحمّل…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="دوّر بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} dir="ltr" />
        <Button onClick={() => void create()} disabled={busy}>
          <Icon name="add" size={16} />
          طقم جديد
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {!shown.length ? (
        <EmptyState icon="collections" title="ما في أطقم بعد">اكبس «طقم جديد» واختار قطع موجودة تلبق مع بعض.</EmptyState>
      ) : (
        <ul className="divide-y border">
          {shown.map((o) => {
            const s = summarise(o);
            const st = OUTFIT_STATUS[o.status] ?? OUTFIT_STATUS.draft!;
            return (
              <li key={o.id}>
                <Link href={`/outfits/${o.id}`} className="flex items-center gap-4 p-3 hover:bg-muted/40">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo} alt="" className="h-20 w-15 shrink-0 bg-muted object-cover" style={{ width: "3.75rem" }} />
                  ) : (
                    <span className="grid h-20 shrink-0 place-items-center bg-muted text-[10px] text-muted-foreground" style={{ width: "3.75rem" }}>
                      بلا صورة
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p dir="ltr" className="truncate text-end font-medium">{o.name_en}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.pieces} قطع · {SELL_MODE_LABEL[o.sell_mode]} ·{" "}
                      <span dir="ltr" className="tabular-nums">
                        {s.price.saving > 0 ? (
                          <>
                            <s>{usd(s.price.sum)}</s> {usd(s.price.pay)}
                          </>
                        ) : (
                          usd(s.price.pay)
                        )}
                      </span>
                    </p>
                    <p className={`text-xs ${s.health.length ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                      {s.health.length ? s.health[0] : "قابل للبيع"}
                    </p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
