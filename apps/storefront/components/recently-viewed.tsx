"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "./product-card";
import { useLocale } from "../lib/locale-client";

const KEY = "bach-recent";
const MAX = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Records the current PDP visit and shows the previous ones. */
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const locale = useLocale();
  const [items, setItems] = useState<CardProduct[]>([]);

  useEffect(() => {
    const previous = readRecent().filter((s) => s !== currentSlug);
    try {
      localStorage.setItem(KEY, JSON.stringify([currentSlug, ...previous].slice(0, MAX)));
    } catch {
      /* storage unavailable */
    }
    if (!previous.length) return;

    void supabaseBrowser()
      .from("products")
      .select(
        "slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path), product_variants(color_en, is_active)",
      )
      .eq("status", "published")
      .in("slug", previous.slice(0, 4))
      .then(({ data }) => {
        const bySlug = new Map(
          ((data ?? []) as unknown as Array<Record<string, unknown>>).map((p) => {
            const media = (p.media_assets as Array<{ kind: string; storage_path: string }>) ?? [];
            const card: CardProduct = {
              slug: p.slug as string,
              name_en: p.name_en as string,
              name_ar: p.name_ar as string | null,
              price_usd_cents: p.price_usd_cents as number,
              sale_price_usd_cents: p.sale_price_usd_cents as number | null,
              front: media.find((m) => m.kind === "front")?.storage_path ?? null,
              back: media.find((m) => m.kind === "back")?.storage_path ?? null,
              colors: ((p.product_variants as Array<{ color_en: string; is_active: boolean }>) ?? [])
                .filter((v) => v.is_active)
                .map((v) => v.color_en),
            };
            return [card.slug, card];
          }),
        );
        // Keep the visit order, newest first.
        setItems(previous.map((s) => bySlug.get(s)).filter((c): c is CardProduct => !!c).slice(0, 4));
      });
  }, [currentSlug]);

  if (!items.length) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{t(locale, "sf.pdp.recentlyViewed")}</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} locale={locale} />
        ))}
      </div>
    </div>
  );
}
