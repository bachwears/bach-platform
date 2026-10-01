"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";

import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../../components/product-card";
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

interface CardRow {
  slug: string;
  name_en: string;
  name_ar: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  media_assets: Array<{ kind: string; storage_path: string }>;
  product_variants: Array<{ id: string; size: string; color_en: string; is_active: boolean }>;
}

const CARD_SELECT =
  "slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path), product_variants(id, size, color_en, is_active)";

function toCard(p: CardRow): CardProduct {
  const active = p.product_variants.filter((v) => v.is_active);
  const seen = new Set<string>();
  return {
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    price_usd_cents: p.price_usd_cents,
    sale_price_usd_cents: p.sale_price_usd_cents,
    front: p.media_assets.find((m) => m.kind === "front")?.storage_path ?? null,
    back: p.media_assets.find((m) => m.kind === "back")?.storage_path ?? null,
    colors: active.map((v) => v.color_en),
    sizes: active.filter((v) => !seen.has(v.size) && seen.add(v.size)).map((v) => ({ variantId: v.id, size: v.size })),
  };
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type Tab = "bag" | "favourites";

/**
 * BAG | FAVOURITES. The bag lists lines with a hairline stepper and a total
 * bar (pinned to the bottom on phones); favourites are the signed-in
 * customer's saved pieces, shown as regular product cards.
 */
export default function CartPage() {
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("bag");
  const [lines, setLines] = useState(readCart());
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [rate, setRate] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [suggested, setSuggested] = useState<CardProduct[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [favs, setFavs] = useState<CardProduct[] | null>(null);

  useEffect(() => onCartChange(() => setLines(readCart())), []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "favourites") setTab("favourites");
  }, []);

  function choose(next: Tab) {
    setTab(next);
    const url = next === "favourites" ? `${window.location.pathname}?tab=favourites` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

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
          name: p.name_en, // product names stay English in every locale
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

  // Signed-in state + favourites (wishlists are keyed by customer).
  useEffect(() => {
    const supabase = supabaseBrowser();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) return;
      const { data: cust } = await supabase.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!cust) {
        setFavs([]);
        return;
      }
      const { data } = await supabase
        .from("wishlists")
        .select(`products(${CARD_SELECT})`)
        .eq("customer_id", cust.id)
        .order("created_at", { ascending: false });
      setFavs(
        ((data ?? []) as unknown as Array<{ products: CardRow | null }>)
          .map((w) => w.products)
          .filter((p): p is CardRow => !!p)
          .map(toCard),
      );
    })();
  }, []);

  const rows = lines.map((l) => ({ line: l, d: details[l.variantId] })).filter((r) => r.d);
  const count = rows.reduce((s, r) => s + r.line.quantity, 0);
  const subtotal = rows.reduce((s, r) => s + r.d!.price * r.line.quantity, 0);
  const overStock = rows.some((r) => r.line.quantity > r.d!.available);
  const bagEmpty = loaded && rows.length === 0;

  // Recommendations for the empty bag: newest photographed pieces.
  useEffect(() => {
    if (!bagEmpty || suggested.length) return;
    void supabaseBrowser()
      .from("products")
      .select(CARD_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) =>
        setSuggested(
          ((data ?? []) as unknown as CardRow[])
            .filter((p) => p.media_assets.some((m) => m.kind === "front"))
            .slice(0, 8)
            .map(toCard),
        ),
      );
  }, [bagEmpty, suggested.length]);

  const lbp = rate ? `${Math.round((subtotal / 100) * rate).toLocaleString("en-US")} LBP` : null;
  const tabClass = (on: boolean) =>
    `type-label pb-2 ${on ? "border-b border-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const loginHref = lhref(locale, "/account/login");

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-8">
        <h1 className="sr-only">{t(locale, "sf.cart.title")}</h1>
        <div role="tablist" className="flex gap-8">
          <button type="button" role="tab" aria-selected={tab === "bag"} className={tabClass(tab === "bag")} onClick={() => choose("bag")}>
            {t(locale, "sf.cart.tabBag")} ({count})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "favourites"}
            className={tabClass(tab === "favourites")}
            onClick={() => choose("favourites")}
          >
            {t(locale, "sf.cart.tabFav")}
          </button>
        </div>

        {tab === "favourites" ? (
          <section className="mt-10" role="tabpanel">
            {signedIn === false ? (
              <div>
                <p className="type-label">{t(locale, "sf.cart.favSignIn")}</p>
                <Link href={loginHref} className="type-label mt-6 inline-grid h-12 w-full max-w-xs place-items-center bg-foreground text-background">
                  {t(locale, "sf.cart.login")}
                </Link>
              </div>
            ) : favs == null ? null : favs.length === 0 ? (
              <p className="type-label">{t(locale, "sf.cart.favEmpty")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
                {favs.map((p) => (
                  <ProductCard key={p.slug} product={p} locale={locale} />
                ))}
              </div>
            )}
          </section>
        ) : !loaded ? null : bagEmpty ? (
          <section className="mt-10" role="tabpanel">
            <p className="type-label">{t(locale, "sf.cart.empty")}</p>
            {signedIn === false ? (
              <p className="type-meta mt-3 text-muted-foreground">
                <Link href={loginHref} className="text-foreground underline underline-offset-4">
                  {t(locale, "sf.cart.login")}
                </Link>{" "}
                {t(locale, "sf.cart.loginHint")}
              </p>
            ) : null}
            {suggested.length ? (
              <>
                <h2 className="type-heading mb-6 mt-16">{t(locale, "sf.cart.mayLike")}</h2>
                <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
                  {suggested.map((p) => (
                    <ProductCard key={p.slug} product={p} locale={locale} />
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : (
          <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]" role="tabpanel">
            <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map(({ line, d }) => (
                <li key={line.variantId} className="flex gap-4 sm:block">
                  <Link href={lhref(locale, `/products/${d!.slug}`)} className="block w-28 shrink-0 bg-secondary sm:w-full" tabIndex={-1} aria-hidden>
                    {d!.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d!.image} alt="" className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <span className="block aspect-[3/4] w-full" />
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col sm:mt-3">
                    <Link href={lhref(locale, `/products/${d!.slug}`)} className="type-meta line-clamp-2 hover:opacity-60">
                      {d!.name}
                    </Link>
                    <p className="type-meta mt-1 tabular-nums">{usd(d!.price * line.quantity)}</p>
                    <p className="type-meta mt-1 text-muted-foreground">
                      {d!.size} | {d!.color_en}
                    </p>
                    <div className="mt-auto flex items-center pt-4 sm:mt-4 sm:pt-0">
                      <div className="flex items-center border">
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center hover:bg-secondary"
                          aria-label={t(locale, "sf.cart.decrease")}
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="type-meta w-8 text-center tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center hover:bg-secondary disabled:opacity-30"
                          aria-label={t(locale, "sf.cart.increase")}
                          disabled={line.quantity >= Math.min(d!.available, 10)}
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="type-meta ms-4 h-10 underline underline-offset-4 hover:opacity-60"
                        onClick={() => setQuantity(line.variantId, 0)}
                      >
                        {t(locale, "sf.cart.remove")}
                      </button>
                    </div>
                    {line.quantity > d!.available && (
                      <p className="type-meta mt-2 text-destructive">{t(locale, "sf.cart.onlyStock", { n: d!.available })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Total: a side column on desktop; on phones a bar that stays at the
                bottom of the screen while the lines scroll, then settles under them. */}
            <aside className="sticky bottom-0 z-30 -mx-4 border-t bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:-mx-8 sm:px-8 lg:bottom-auto lg:top-24 lg:mx-0 lg:h-fit lg:self-start lg:border lg:p-6">
              <div className="flex items-center justify-between gap-4 lg:block">
                <div className="lg:space-y-2">
                  <p className="type-label flex justify-between gap-6 tabular-nums">
                    <span>{t(locale, "sf.cart.total")}</span>
                    <span>{usd(subtotal)}</span>
                  </p>
                  {lbp ? <p className="type-meta text-muted-foreground tabular-nums lg:text-end">{lbp}</p> : null}
                  <p className="type-meta mt-4 hidden normal-case text-muted-foreground lg:block">{t(locale, "sf.cart.codNote")}</p>
                </div>
                {overStock ? (
                  <button type="button" disabled className="type-label h-12 w-40 shrink-0 bg-foreground text-background opacity-40 lg:mt-6 lg:w-full">
                    {t(locale, "sf.cart.continueBtn")}
                  </button>
                ) : (
                  <Link
                    href={lhref(locale, "/checkout")}
                    className="type-label grid h-12 w-40 shrink-0 place-items-center bg-foreground text-background hover:opacity-90 lg:mt-6 lg:w-full"
                  >
                    {t(locale, "sf.cart.continueBtn")}
                  </Link>
                )}
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}
