"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";

import { t } from "@bach/i18n";

import { onCartChange, readCart, setQuantity } from "../../lib/cart";
import { lhref, useLocale } from "../../lib/locale-client";

interface Detail {
  id: string;
  size: string;
  color_en: string;
  available: number;
  price: number;
  name: string;
  slug: string;
  image: string | null;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const locale = useLocale();
  const [lines, setLines] = useState(readCart());
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [rate, setRate] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => onCartChange(() => setLines(readCart())), []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      if (readCart().length === 0) {
        setLoaded(true);
        return;
      }
      const ids = readCart().map((l) => l.variantId);
      const [{ data }, { data: rateRow }] = await Promise.all([
        supabase
          .from("product_variants")
          .select(
            "id, size, color_en, color_ar, products!inner(slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path)), inventory_levels(quantity, reserved)",
          )
          .in("id", ids)
          .eq("is_active", true),
        supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const map: Record<string, Detail> = {};
      for (const v of (data ?? []) as unknown as Array<Record<string, unknown>>) {
        const p = v.products as {
          slug: string;
          name_en: string;
          name_ar: string | null;
          price_usd_cents: number;
          sale_price_usd_cents: number | null;
          media_assets: Array<{ kind: string; storage_path: string }>;
        };
        const lvl = (v.inventory_levels as Array<{ quantity: number; reserved: number }>)[0];
        map[v.id as string] = {
          id: v.id as string,
          size: v.size as string,
          color_en: (locale === "ar" && v.color_ar ? v.color_ar : v.color_en) as string,
          available: lvl ? lvl.quantity - lvl.reserved : 0,
          price: Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents),
          name: locale === "ar" && p.name_ar ? p.name_ar : p.name_en,
          slug: p.slug,
          image: p.media_assets?.find((m) => m.kind === "front")?.storage_path ?? null,
        };
      }
      setDetails(map);
      setRate(rateRow ? Number(rateRow.lbp_per_usd) : null);
      setLoaded(true);
    }
    void load();
  }, [lines.length, locale]);

  const rows = lines.map((l) => ({ line: l, d: details[l.variantId] })).filter((r) => r.d);
  const subtotal = rows.reduce((s, r) => s + r.d!.price * r.line.quantity, 0);

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.cart.title")}</h1>

        {!loaded ? null : rows.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">{t(locale, "sf.cart.empty")}</p>
            <Link href={lhref(locale, "/shop")} className="mt-4 inline-block underline underline-offset-4">
              {t(locale, "sf.cart.continue")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
            <ul className="space-y-6">
              {rows.map(({ line, d }) => (
                <li key={line.variantId} className="flex gap-4 border-b pb-6">
                  <Link href={lhref(locale, `/products/${d!.slug}`)} className="block h-28 w-20 shrink-0 bg-secondary">
                    {d!.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d!.image} alt={d!.name} className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link href={lhref(locale, `/products/${d!.slug}`)} className="font-medium hover:underline">
                          {d!.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {d!.size} · {d!.color_en}
                        </p>
                      </div>
                      <p className="font-mono">{usd(d!.price * line.quantity)}</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <Button size="sm" variant="outline" onClick={() => setQuantity(line.variantId, line.quantity - 1)}>
                        −
                      </Button>
                      <span className="w-6 text-center font-mono text-sm">{line.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={line.quantity >= Math.min(d!.available, 10)}
                        onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      >
                        +
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setQuantity(line.variantId, 0)}>
                        {t(locale, "sf.cart.remove")}
                      </Button>
                      {line.quantity > d!.available && (
                        <span className="text-xs text-destructive">{t(locale, "sf.cart.onlyStock", { n: d!.available })}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit space-y-3 border p-5 text-sm lg:sticky lg:top-8">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t(locale, "sf.cart.subtotal")}</span>
                <span className="font-mono">{usd(subtotal)}</span>
              </div>
              {rate && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t(locale, "sf.cart.inLbp")}</span>
                  <span className="font-mono">{Math.round((subtotal / 100) * rate).toLocaleString("en-US")} LBP</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t(locale, "sf.cart.codNote")}</p>
              <Link href={lhref(locale, "/checkout")} className="block">
                <Button className="h-11 w-full" disabled={rows.some((r) => r.line.quantity > r.d!.available)}>
                  {t(locale, "sf.cart.checkout")}
                </Button>
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
