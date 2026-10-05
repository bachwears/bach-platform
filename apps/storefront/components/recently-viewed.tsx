"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "./product-card";
import { CARD_COLUMNS, toCardProduct, type CardRow } from "../lib/card";
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
      .select(CARD_COLUMNS)
      .eq("status", "published")
      .in("slug", previous.slice(0, 4))
      .then(({ data }) => {
        const bySlug = new Map(
          ((data ?? []) as unknown as CardRow[]).map((p) => {
            const card = toCardProduct(p as unknown as CardRow);
            return [card.slug, card];
          }),
        );
        // Keep the visit order, newest first.
        setItems(previous.map((s) => bySlug.get(s)).filter((c): c is CardProduct => !!c?.front).slice(0, 4));
      });
  }, [currentSlug]);

  if (!items.length) return null;

  return (
    <div>
      <h2 className="type-heading">{t(locale, "sf.pdp.recentlyViewed")}</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} locale={locale} source="recent" />
        ))}
      </div>
    </div>
  );
}
