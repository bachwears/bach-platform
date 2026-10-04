"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";

import { t } from "@bach/i18n";

import { clearCart, readCart, setQuantity } from "../../lib/cart";
import { colourPhoto } from "../../lib/media";
import { deliveryFor, useDeliveryRule } from "../../lib/delivery";
import { lhref, useLocale } from "../../lib/locale-client";

interface SummaryLine {
  name: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
  image?: string | null;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const [summary, setSummary] = useState<SummaryLine[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState("");
  const [promoState, setPromoState] = useState<{ status: "idle" | "ok" | "bad"; message?: string; kind?: string; value?: number }>({ status: "idle" });
  const [signedIn, setSignedIn] = useState(false);
  const [methods, setMethods] = useState<string[]>(["cod"]);
  const [payMethod, setPayMethod] = useState("cod");
  const [walletBalance, setWalletBalance] = useState(0);
  const deliveryRule = useDeliveryRule();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      const cart = readCart();
      if (cart.length === 0) {
        router.replace(lhref(locale, "/cart"));
        return;
      }
      const [{ data, error: loadError }, { data: rateRow }] = await Promise.all([
        supabase
          .from("product_variants")
          .select("id, size, color_en, color_ar, is_active, products!inner(name_en, name_ar, price_usd_cents, sale_price_usd_cents, status, media_assets(kind, storage_path, color_en, sort))")
          .in("id", cart.map((l) => l.variantId)),
        supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      // A failed read says nothing about the pieces: keep the bag, ask to retry.
      if (loadError || !data) {
        setNotice(t(locale, "sf.co.loadError"));
        return;
      }
      // A bag can outlive a piece (deleted, switched off, unpublished): drop those
      // lines now rather than let "Place order" fail on them.
      const sellable = (v: Record<string, unknown> | undefined) =>
        !!v && v.is_active !== false && (v.products as { status?: string } | null)?.status === "published";
      const dead = cart.filter((l) => !sellable((data ?? []).find((x) => x.id === l.variantId) as Record<string, unknown> | undefined));
      if (dead.length) {
        dead.forEach((l) => setQuantity(l.variantId, 0));
        setNotice(t(locale, "sf.co.removedGone", { n: String(dead.length) }));
        if (dead.length === cart.length) {
          router.replace(lhref(locale, "/cart"));
          return;
        }
      }
      setSummary(
        cart.flatMap((l) => {
          const v = (data ?? []).find((x) => x.id === l.variantId) as Record<string, unknown> | undefined;
          if (!sellable(v) || !v) return [];
          const p = v.products as {
            name_en: string;
            name_ar: string | null;
            price_usd_cents: number;
            sale_price_usd_cents: number | null;
            media_assets?: Array<{ kind: string; storage_path: string; color_en: string | null; sort: number | null }>;
          };
          const price = Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);
          const name = p.name_en; // product names stay English in every locale
          const color = (locale === "ar" && v.color_ar ? v.color_ar : v.color_en) as string;
          // a photo in the bought colour when there is one, else the main photo
          const media = p.media_assets ?? [];
          const image = colourPhoto(media, v.color_en as string);
          return [{ name, size: v.size as string, color, quantity: l.quantity, lineTotal: price * l.quantity, image }];
        }),
      );
      setRate(rateRow ? Number(rateRow.lbp_per_usd) : null);
      const { data: sess } = await supabase.auth.getSession();
      setSignedIn(!!sess.session);
      const { data: pm } = await supabase.from("payment_methods").select("kind").eq("is_enabled", true).in("kind", ["cod", "stripe"]);
      void supabase.auth.getUser().then(async ({ data: u }) => {
        if (!u.user) return;
        const { data: c } = await supabase
          .from("customers")
          .select("id, full_name, phone, email, balance_usd_cents")
          .eq("auth_user_id", u.user.id)
          .maybeSingle();
        setWalletBalance(c?.balance_usd_cents ?? 0);
        // Signed in: start from the account details and the last delivery address.
        // Only empty fields are filled, so nothing the shopper already typed is replaced.
        const { data: last } = c
          ? await supabase
              .from("orders")
              .select("ship_city, ship_address")
              .eq("customer_id", c.id)
              .eq("channel", "online")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null };
        const fill = (set: (fn: (cur: string) => string) => void, value?: string | null) =>
          value && set((cur) => cur || value);
        fill(setName, c?.full_name);
        fill(setPhone, c?.phone);
        fill(setEmail, c?.email ?? u.user.email);
        fill(setCity, last?.ship_city);
        fill(setAddress, last?.ship_address);
      });
      const kinds = (pm ?? []).map((x) => x.kind);
      if (kinds.length) setMethods(kinds.sort());
    }
    void load();
  }, [router, locale]);

  const subtotal = summary.reduce((s, l) => s + l.lineTotal, 0);
  const promoDiscount =
    promoState.status === "ok" && promoState.value
      ? promoState.kind === "percent"
        ? Math.round((subtotal * promoState.value) / 100)
        : Math.min(promoState.value, subtotal)
      : 0;
  // Delivery is judged on the pieces after the promo (before any wallet reward),
  // the same rule the checkout RPC applies.
  const delivery = deliveryFor(subtotal - promoDiscount, deliveryRule);
  // wallet payers get 10% off the pieces (integer cents, as the RPC rounds); delivery is paid in full
  const walletDiscount = Math.round((subtotal - promoDiscount) / 10);
  const walletPays = subtotal - promoDiscount - walletDiscount + delivery;
  const walletOffered = walletBalance > 0 && walletBalance >= walletPays;
  const payingWallet = payMethod === "wallet" && walletOffered;
  const total = subtotal - promoDiscount + delivery - (payingWallet ? walletDiscount : 0);
  // The wallet option hides when the balance no longer covers the order (e.g. a promo
  // was removed): fall back to cash on delivery rather than keep a hidden choice.
  useEffect(() => {
    if (payMethod === "wallet" && !walletOffered) setPayMethod("cod");
  }, [payMethod, walletOffered]);
    const phoneOk = phone.replace(/[^0-9+]/g, "").length >= 7;
  const emailOk = !email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canPlace = !busy && summary.length > 0 && name.trim() && phoneOk && emailOk && city.trim() && address.trim();

  async function placeOrder() {
    if (!canPlace) return;
    setBusy(true);
    setError("");
    const supabase = supabaseBrowser();
    const call = () =>
      supabase.rpc("storefront_checkout", {
        p_items: readCart().map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        p_name: name.trim(),
        p_phone: phone,
        p_city: city.trim(),
        p_address: address.trim(),
        p_note: note.trim() || null,
        p_email: email.trim() || null,
        p_promocode: promoState.status === "ok" ? promo.trim() : null,
        p_payment_method: payMethod === "wallet" ? "cod" : payMethod,
        p_use_wallet: payMethod === "wallet",
      });
    let { data, error: err } = await call();
    // A stale sign-in (e.g. after a password change elsewhere) must not block a
    // sale: drop the dead session on this device and place the order as a guest.
    if (err && payMethod !== "wallet" && /jwt|token|PGRST30|401/i.test(`${err.code ?? ""} ${err.message}`)) {
      await supabase.auth.signOut({ scope: "local" });
      setSignedIn(false);
      ({ data, error: err } = await call());
    }
    setBusy(false);
    if (err) {
      const m = err.message;
      const known: Array<[RegExp, string]> = [
        [/insufficient stock/, t(locale, "sf.co.soldOut")],
        [/wallet/, t(locale, "sf.co.errWallet")],
        [/name required/, t(locale, "sf.co.errName")],
        [/valid phone/, t(locale, "sf.co.errPhone")],
        [/delivery address/, t(locale, "sf.co.errAddress")],
        [/valid email/, t(locale, "sf.co.errEmail")],
        [/no longer available/, t(locale, "sf.co.errGone")],
        [/invalid quantity|cart must have/, t(locale, "sf.co.errQty")],
        [/payment method/, t(locale, "sf.co.errMethod")],
        [/temporarily unavailable/, t(locale, "sf.co.errDown")],
      ];
      const hit = known.find(([re]) => re.test(m));
      if (hit) setError(hit[1]);
      else if (m.startsWith("promocode:")) setError(`${t(locale, "sf.co.promo")}: ${m.slice(10).trim()}`);
      else {
        // unexpected: keep the reason visible so it can be reported and fixed
        setError(`${t(locale, "sf.co.failed")} (${m})`);
        console.error("checkout failed", err);
      }
      return;
    }
    if (payMethod === "stripe") {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ order_id: data![0].order_id, origin: window.location.origin }),
        });
        const pay = await res.json();
        if (res.ok && pay.url) {
          clearCart();
          window.location.href = pay.url;
          return;
        }
      } catch {
        /* fall through to COD-style confirmation; the shop will follow up */
      }
    }
    clearCart();
    try {
      sessionStorage.setItem(
        "bach-checkout-info",
        JSON.stringify({ name: name.trim(), phone, email: email.trim(), city: city.trim(), address: address.trim() }),
      );
      // what the confirmation page shows back (this browser only)
      sessionStorage.setItem(
        "bach-last-order",
        JSON.stringify({
          n: data![0].order_number,
          lines: summary,
          total,
          discount: promoDiscount + (payingWallet ? walletDiscount : 0),
          delivery,
          rate,
          city: city.trim(),
          address: address.trim(),
          wallet: payMethod === "wallet",
        }),
      );
    } catch {
      /* storage unavailable */
    }
    router.replace(lhref(locale, `/confirmed?n=${data![0].order_number}`));
  }

  const payOption = (key: string, title: string, sub: React.ReactNode) => (
    <button
      key={key}
      type="button"
      role="radio"
      aria-checked={payMethod === key}
      onClick={() => setPayMethod(key)}
      className="flex w-full items-start gap-4 border-b py-4 text-start"
    >
      <span
        aria-hidden
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center border ${payMethod === key ? "border-foreground" : "border-border"}`}
      >
        {payMethod === key ? <span className="h-2 w-2 bg-foreground" /> : null}
      </span>
      <span>
        <span className="type-label block">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-dvh bg-background">
      <main data-checkout className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-8">
        <h1 className="type-heading">{t(locale, "sf.co.title")}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.co.sub")}</p>
        {notice ? <p className="mt-4 border border-foreground px-4 py-3 text-xs">{notice}</p> : null}

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
          <div className="max-w-2xl space-y-12">
            <Step n={1} title={t(locale, "sf.co.stepContact")}>
              <Field label={t(locale, "sf.co.name")}>
                <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t(locale, "sf.co.phone")}>
                  <input
                    className={INPUT}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+961 71 000 000"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                  />
                </Field>
                <Field label={t(locale, "sf.co.email")}>
                  <input
                    className={INPUT}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                  />
                </Field>
              </div>
            </Step>

            <Step n={2} title={t(locale, "sf.co.stepAddress")}>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t(locale, "sf.co.city")}>
                  <input className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                </Field>
                <Field label={t(locale, "sf.co.address")}>
                  <input className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                </Field>
              </div>
              <Field label={t(locale, "sf.co.notes")}>
                <textarea className={`${INPUT} h-auto resize-none py-2`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </Field>
            </Step>

            <Step n={3} title={t(locale, "sf.co.payment")}>
              <div role="radiogroup" aria-label={t(locale, "sf.co.payment")} className="border-t">
                {walletOffered &&
                  payOption(
                    "wallet",
                    "Pay from wallet — 10% off",
                    <span dir="ltr">
                      Balance ${(walletBalance / 100).toFixed(2)} · you pay ≈ ${(walletPays / 100).toFixed(2)}
                    </span>,
                  )}
                {methods.includes("cod") && payOption("cod", t(locale, "sf.co.cod"), t(locale, "sf.co.codSub"))}
                {methods.includes("stripe") && payOption("stripe", t(locale, "sf.co.card"), t(locale, "sf.co.cardSub"))}
              </div>
            </Step>

            <Step n={4} title={t(locale, "sf.co.promo")}>
              {signedIn ? (
                <div>
                  <div className="flex items-end gap-4">
                    <input
                      className={`${INPUT} font-mono uppercase`}
                      value={promo}
                      onChange={(e) => {
                        setPromo(e.target.value);
                        setPromoState({ status: "idle" });
                      }}
                      placeholder="MYBIRTHDAY"
                      aria-label={t(locale, "sf.co.promo")}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="type-label h-11 shrink-0 underline underline-offset-4 hover:opacity-60 disabled:opacity-30 disabled:no-underline"
                      disabled={!promo.trim()}
                      onClick={async () => {
                        const { data } = await supabaseBrowser().rpc("validate_promocode", { p_code: promo.trim() });
                        const v = data?.[0];
                        setPromoState(
                          v?.valid
                            ? { status: "ok", kind: v.kind, value: v.value }
                            : { status: "bad", message: v?.message ?? "invalid code" },
                        );
                      }}
                    >
                      {t(locale, "sf.co.apply")}
                    </button>
                  </div>
                  {promoState.status === "ok" && (
                    <p className="mt-2 text-xs">✓ {t(locale, "sf.co.promoOk", { v: `${(promoDiscount / 100).toFixed(2)}` })}</p>
                  )}
                  {promoState.status === "bad" && <p className="mt-2 text-xs text-destructive">{promoState.message}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t(locale, "sf.co.promoAsk")}{" "}
                  <Link href={lhref(locale, "/account/login")} className="text-foreground underline underline-offset-4">
                    {t(locale, "sf.pdp.signIn")}
                  </Link>{" "}
                  {t(locale, "sf.co.promoSignIn")}
                </p>
              )}
            </Step>

            {/* Phones: the button rides along the bottom of the screen. */}
            <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-0 lg:p-0">
              {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
              <button
                type="button"
                className="type-label h-12 w-full bg-foreground text-background hover:opacity-90 disabled:opacity-40"
                disabled={!canPlace}
                onClick={() => void placeOrder()}
              >
                {busy ? t(locale, "sf.co.placing") : t(locale, "sf.co.place", { v: usd(total) })}
              </button>
              <p className="mt-3 hidden text-center text-xs text-muted-foreground lg:block">{t(locale, "sf.co.consent")}</p>
            </div>
            <p className="-mt-8 text-center text-xs text-muted-foreground lg:hidden">{t(locale, "sf.co.consent")}</p>
          </div>

          <aside className="order-first h-fit border p-5 lg:sticky lg:top-24 lg:order-none lg:p-6">
            <p className="type-heading mb-4">{t(locale, "sf.co.summary")}</p>
            <ul className="space-y-3">
              {summary.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="type-meta block">{l.name}</span>
                    <span className="type-meta block text-muted-foreground">
                      {l.size} | {l.color} · × {l.quantity}
                    </span>
                  </span>
                  <span className="type-meta shrink-0 tabular-nums">{usd(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {promoDiscount > 0 && (
              <p className="type-meta mt-3 flex justify-between">
                <span>{t(locale, "sf.co.promoDiscount")}</span>
                <span className="tabular-nums">- {usd(promoDiscount)}</span>
              </p>
            )}
            {payingWallet && (
              <p className="type-meta mt-3 flex justify-between">
                <span>{t(locale, "sf.co.walletDiscount")}</span>
                <span className="tabular-nums">- {usd(walletDiscount)}</span>
              </p>
            )}
            <p className="type-meta mt-3 flex justify-between">
              <span>{t(locale, "sf.co.delivery")}</span>
              <span className="tabular-nums">{delivery ? usd(delivery) : t(locale, "sf.co.deliveryFree")}</span>
            </p>
            {delivery ? (
              <p className="type-meta mt-1 text-muted-foreground">
                {t(locale, "sf.co.freeFrom", { v: usd(deliveryRule.freeOver) })}
              </p>
            ) : null}
            <p className="type-label mt-4 flex justify-between border-t pt-4">
              <span>{t(locale, "sf.co.total")}</span>
              <span className="tabular-nums">{usd(total)}</span>
            </p>
            {rate && (
              <p className="type-meta mt-1 text-end tabular-nums text-muted-foreground" dir="ltr">
                ≈ {Math.round((total / 100) * rate).toLocaleString("en-US")} LBP
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{t(locale, "sf.co.cashNote")}</p>
            <Link href={lhref(locale, "/cart")} className="type-meta mt-4 inline-block underline underline-offset-4 hover:opacity-60">
              {t(locale, "sf.co.editBag")}
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

const INPUT =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="type-heading mb-6">
        <span className="text-muted-foreground">{String(n).padStart(2, "0")}</span> {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="type-meta text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
