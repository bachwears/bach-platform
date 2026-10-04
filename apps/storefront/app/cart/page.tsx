"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { supabaseBrowser } from "@bach/supabase/browser";

import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../../components/product-card";
import { CARD_COLUMNS, toCardProduct } from "../../lib/card";
import { onCartChange, readCart, setQuantity } from "../../lib/cart";
import { colourPhoto, photoSrc } from "../../lib/media";
import { deliveryFor, useDeliveryRule } from "../../lib/delivery";
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

const CARD_SELECT = CARD_COLUMNS;

const toCard = (p: CardRow): CardProduct => toCardProduct(p);

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
  const deliveryRule = useDeliveryRule();
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [suggested, setSuggested] = useState<CardProduct[]>([]);
  const [addOns, setAddOns] = useState<CardProduct[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [favs, setFavs] = useState<Array<{ productId: string; card: CardProduct }> | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [favError, setFavError] = useState(false);

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
      const [{ data, error: loadError }, { data: rateRow }] = await Promise.all([
        supabase
          .from("product_variants")
          .select(
            "id, size, color_code, color_en, color_ar, products!inner(slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, status, media_assets(kind, storage_path, color_en, sort)), inventory_levels(quantity, reserved)",
          )
          .in("id", ids)
          .eq("is_active", true),
        supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      // A failed read (network, expired session) says nothing about the pieces:
      // keep every line and let the shopper retry rather than emptying the bag.
      if (loadError || !data) {
        setNotice(t(locale, "sf.co.loadError"));
        setLoaded(true);
        return;
      }
      const map: Record<string, Detail> = {};
      for (const v of (data ?? []) as unknown as Array<Record<string, unknown>>) {
        const p = v.products as {
          status?: string;
          slug: string;
          name_en: string;
          name_ar: string | null;
          price_usd_cents: number;
          sale_price_usd_cents: number | null;
          media_assets: Array<{ kind: string; storage_path: string; color_en: string | null; sort: number | null }>;
        };
        if (p.status !== "published") continue;
        // One row per branch: sum them, as the cards and the product page do.
        const levels = (v.inventory_levels as Array<{ quantity: number; reserved: number }> | null) ?? [];
        map[v.id as string] = {
          id: v.id as string,
          size: v.size as string,
          color_en: (locale === "ar" && v.color_ar ? v.color_ar : v.color_en) as string,
          available: levels.reduce((n, l) => n + l.quantity - l.reserved, 0),
          price: Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents),
          name: p.name_en, // product names stay English in every locale
          // opens the product on the colour in the bag
          slug: `${p.slug}?color=${v.color_code as string}`,
          image: colourPhoto(p.media_assets ?? [], v.color_en as string),
        };
      }
      // Lines whose piece is gone (deleted, switched off, unpublished) would
      // otherwise sit invisibly in the bag count and break checkout.
      const dead = readCart().filter((l) => !map[l.variantId]);
      if (dead.length) {
        dead.forEach((l) => setQuantity(l.variantId, 0));
        setNotice(t(locale, "sf.co.removedGone", { n: String(dead.length) }));
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
      setCustomerId(cust.id);
      const { data } = await supabase
        .from("wishlists")
        .select(`product_id, products(${CARD_SELECT})`)
        .eq("customer_id", cust.id)
        .order("created_at", { ascending: false });
      setFavs(
        ((data ?? []) as unknown as Array<{ product_id: string; products: CardRow | null }>)
          .filter((w) => !!w.products)
          .map((w) => ({ productId: w.product_id, card: toCard(w.products!) })),
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
            .slice(0, 12)
            .map(toCard),
        ),
      );
  }, [bagEmpty, suggested.length]);

  // A bag with something in it offers finishing touches under $40: next to the piece
  // already chosen they read as small additions (the bag item is the price anchor).
  const bagSlugs = rows.map((r) => r.d!.slug.split("?")[0]).join(",");
  useEffect(() => {
    if (!loaded || !bagSlugs) return;
    const inBag = new Set(bagSlugs.split(","));
    void supabaseBrowser()
      .from("products")
      .select(CARD_SELECT)
      .eq("status", "published")
      .lte("price_usd_cents", 4000)
      .order("price_usd_cents", { ascending: true })
      .limit(40)
      .then(({ data }) =>
        setAddOns(
          ((data ?? []) as unknown as CardRow[])
            .filter((p) => !inBag.has(p.slug) && p.media_assets.some((m) => m.kind === "front"))
            .slice(0, 10)
            .map(toCard),
        ),
      );
  }, [loaded, bagSlugs]);

  const delivery = subtotal > 0 ? deliveryFor(subtotal, deliveryRule) : 0;
  const lbp = rate ? `${Math.round(((subtotal + delivery) / 100) * rate).toLocaleString("en-US")} LBP` : null;
  const tabClass = (on: boolean) =>
    `type-label flex items-center gap-2 pb-2 ${on ? "font-semibold" : "text-muted-foreground hover:text-foreground"}`;
  const loginHref = lhref(locale, "/account/login");

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-8">
        <h1 className="sr-only">{t(locale, "sf.cart.title")}</h1>
        {notice ? <p className="mb-6 border border-foreground px-4 py-3 text-xs">{notice}</p> : null}
        <div role="tablist" className="flex gap-8">
          <button type="button" role="tab" aria-selected={tab === "bag"} className={tabClass(tab === "bag")} onClick={() => choose("bag")}>
            {t(locale, "sf.cart.tabBag")} <span className="tabular-nums">({count})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "favourites"}
            className={tabClass(tab === "favourites")}
            onClick={() => choose("favourites")}
          >
            {t(locale, "sf.cart.tabFav")}
            <Bookmark className="h-4 w-4" strokeWidth={1.25} aria-hidden />
          </button>
        </div>

        {tab === "favourites" ? (
          <section className="mt-10" role="tabpanel">
            {signedIn === false ? (
              <div className="pt-6">
                <p className="text-sm">{t(locale, "sf.cart.favSignIn")}</p>
                <Link
                  href={loginHref}
                  className="type-label mt-8 grid h-11 w-full max-w-60 place-items-center border border-foreground hover:bg-foreground hover:text-background"
                >
                  {t(locale, "sf.cart.login")}
                </Link>
                <p className="mt-6 flex items-center gap-10 text-sm">
                  <span>{t(locale, "sf.cart.noAccount")}</span>
                  <Link href={lhref(locale, "/account/new")} className="type-label hover:opacity-60">
                    {t(locale, "sf.cart.register")}
                  </Link>
                </p>
              </div>
            ) : favs == null ? null : favs.length === 0 ? (
              <p className="type-label">{t(locale, "sf.cart.favEmpty")}</p>
            ) : (
              <>
                {favError ? (
                  <p role="alert" className="type-meta mb-6 text-destructive">
                    {t(locale, "sf.pdp.wishError")}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
                  {favs.map((f) => (
                    <div key={f.productId}>
                      <ProductCard product={f.card} locale={locale} />
                      <button
                        type="button"
                        className="type-meta mt-3 underline underline-offset-4 hover:opacity-60"
                        onClick={async () => {
                          const before = favs;
                          setFavError(false);
                          setFavs((cur) => (cur ?? []).filter((x) => x.productId !== f.productId));
                          if (!customerId) return;
                          const { error } = await supabaseBrowser()
                            .from("wishlists")
                            .delete()
                            .eq("customer_id", customerId)
                            .eq("product_id", f.productId);
                          // put the piece back where it was if the delete didn't go through
                          if (error) {
                            setFavs(before);
                            setFavError(true);
                          }
                        }}
                      >
                        {t(locale, "sf.cart.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : !loaded ? null : bagEmpty ? (
          <section role="tabpanel">
            <div className="pb-20 pt-24">
              <svg viewBox="0 0 24 28" className="h-9 w-8" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
                <path d="M2.5 8.5h19v18h-19z" />
                <path d="M8 8.5V6a4 4 0 0 1 8 0v2.5" />
              </svg>
              <p className="type-label mt-6">{t(locale, "sf.cart.empty")}</p>
              <Link href={lhref(locale, "/shop")} className="mt-2 inline-block text-sm hover:opacity-60">
                {t(locale, "sf.cart.emptyExplore")}
              </Link>
            </div>
            {suggested.length ? (
              <>
                <h2 className="type-label mb-6">{t(locale, "sf.cart.mayLike")}</h2>
                <ul className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 [&::-webkit-scrollbar]:hidden">
                  {suggested.map((p) => (
                    <li key={p.slug} className="w-[31%] shrink-0 snap-start sm:w-[22%] lg:w-[15%]">
                      <ProductCard product={p} locale={locale} variant="mini" />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : (
          <>
          <section className="mt-8 grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0" role="tabpanel">
            <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map(({ line, d }) => (
                <li key={line.variantId} className="flex gap-4 sm:block">
                  <Link href={lhref(locale, `/products/${d!.slug}`)} className="block w-28 shrink-0 bg-secondary sm:w-full" tabIndex={-1} aria-hidden>
                    {d!.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img {...photoSrc(d!.image, "120px")} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
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

            {/* Total: a side column on desktop; on phones a bar fixed to the bottom
                of the screen (the list keeps room for it underneath). */}
            <aside className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-8 lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-24 lg:h-fit lg:self-start lg:border lg:p-6">
              <div className="flex items-center justify-between gap-4 lg:block">
                <div className="lg:space-y-2">
                  <p className="type-label flex justify-between gap-6 tabular-nums">
                    <span>{t(locale, "sf.cart.total")}</span>
                    <span>{usd(subtotal + delivery)}</span>
                  </p>
                  {lbp ? <p className="type-meta text-muted-foreground tabular-nums lg:text-end">{lbp}</p> : null}
                  <p className="type-meta text-muted-foreground lg:mt-2">
                    {delivery
                      ? t(locale, "sf.cart.withDelivery", { v: usd(delivery), f: usd(deliveryRule.freeOver) })
                      : t(locale, "sf.cart.freeDelivery")}
                  </p>
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
          {addOns.length ? (
            <section className="-mt-16 pb-32 lg:mt-16 lg:pb-0" aria-label={t(locale, "sf.cart.finishing")}>
              <h2 className="type-label mb-6">{t(locale, "sf.cart.finishing")}</h2>
              <ul className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 [&::-webkit-scrollbar]:hidden">
                {addOns.map((p) => (
                  <li key={p.slug} className="w-[31%] shrink-0 snap-start sm:w-[22%] lg:w-[15%]">
                    <ProductCard product={p} locale={locale} variant="mini" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          </>
        )}
      </main>
    </div>
  );
}
