"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { ChevronRight } from "lucide-react";
import { t, type Locale } from "@bach/i18n";

import { AccountPassword } from "../../components/account-password";
import { AccountPrivacy } from "../../components/account-privacy";
import { AccountProfile, type ProfileCustomer } from "../../components/account-profile";
import { AccountTwoStep } from "../../components/account-two-step";
import { lhref, useLocale } from "../../lib/locale-client";
import { loyaltyRule, ptsUnit, rewardValue, usdShort, useLoyalty } from "../../lib/loyalty";

interface PointsMove {
  id: number;
  delta: number;
  kind: string;
  note: string | null;
  created_at: string;
}

interface MyOrder {
  id: string;
  number: number;
  status: string;
  total_usd_cents: number;
  created_at: string;
  channel: string;
  order_items: Array<{ name_en: string; size: string; color_en: string; quantity: number }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Arabic uses singular / dual / plural forms; English just pluralizes.
function unit(locale: Locale, n: number, kind: "year" | "month" | "day"): string {
  if (locale === "ar") {
    const [one, two, many] = {
      year: ["سنة", "سنتين", "سنين"] as const,
      month: ["شهر", "شهرين", "أشهر"] as const,
      day: ["يوم", "يومين", "أيام"] as const,
    }[kind];
    if (n === 1) return one;
    if (n === 2) return two;
    return `${n} ${many}`;
  }
  return `${n} ${kind}${n > 1 ? "s" : ""}`;
}

function tenure(locale: Locale, sinceIso: string): string {
  const since = new Date(sinceIso);
  const now = new Date();
  let years = now.getFullYear() - since.getFullYear();
  let months = now.getMonth() - since.getMonth();
  let days = now.getDate() - since.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(unit(locale, years, "year"));
  if (months > 0) parts.push(unit(locale, months, "month"));
  if (years === 0 && days > 0) parts.push(unit(locale, days, "day"));
  if (!parts.length) return t(locale, "sf.acct.firstDay");
  return parts.join(locale === "ar" ? " و" : ", ");
}

function statusLabel(locale: Locale, status: string) {
  const label = t(locale, `sf.ostatus.${status}`);
  return label === `sf.ostatus.${status}` ? status : label;
}

export default function AccountPage() {
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? "ar-LB" : "en-GB";
  const [topups, setTopups] = useState<Array<{ id: string; amount_usd_cents: number; receipt_no: string; status: string; created_at: string }>>([]);
  const [tuAmount, setTuAmount] = useState("");
  const [tuReceipt, setTuReceipt] = useState("");
  const [tuBusy, setTuBusy] = useState(false);
  const [tuMsg, setTuMsg] = useState("");
  const [customer, setCustomer] = useState<
    | (Partial<ProfileCustomer> & {
        id?: string;
        full_name: string | null;
        created_at: string;
        birthday?: string | null;
        marketing_consent?: boolean;
      })
    | null
  >(null);
  const [userEmail, setUserEmail] = useState("");
  const [bdayInput, setBdayInput] = useState("");
  const [bdayMsg, setBdayMsg] = useState("");
  const [consentError, setConsentError] = useState(false);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [wishlist, setWishlist] = useState<Array<{ product_id: string; products: { slug: string; name_en: string; name_ar: string | null; price_usd_cents: number; sale_price_usd_cents: number | null } }>>([]);
  const [loaded, setLoaded] = useState(false);
  const loyalty = useLoyalty();
  const [moves, setMoves] = useState<PointsMove[]>([]);
  const [ptsBusy, setPtsBusy] = useState(false);
  const [ptsMsg, setPtsMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  // /account?open=orders (e.g. from the order confirmation) opens the orders row
  const [openOrders, setOpenOrders] = useState(false);
  useEffect(() => {
    setOpenOrders(new URLSearchParams(window.location.search).get("open") === "orders");
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(lhref(locale, "/account/login"));
        return;
      }
      const { data: cust } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      setUserEmail(user.email ?? "");
      setCustomer(cust ?? { full_name: user.email ?? null, created_at: user.created_at });
      if (cust) {
        void supabase
          .from("wallet_topups")
          .select("id, amount_usd_cents, receipt_no, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10)
          .then(({ data: t2 }) => setTopups(t2 ?? []));
        void loadMoves(cust.id);
        const [{ data }, { data: wl }] = await Promise.all([
          supabase
            .from("orders")
            .select("id, number, status, total_usd_cents, created_at, channel, order_items(name_en, size, color_en, quantity)")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("wishlists")
            .select("product_id, products(slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents)")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false }),
        ]);
        setOrders((data ?? []) as unknown as MyOrder[]);
        setWishlist((wl ?? []) as unknown as typeof wishlist extends Array<infer T> ? T[] : never);
      }
      setLoaded(true);
    }
    void load();
  }, [router, locale]);

  // Points history; an error (programme not live yet) just leaves it empty.
  async function loadMoves(customerId: string) {
    const { data, error } = await supabaseBrowser()
      .from("loyalty_points")
      .select("id, delta, kind, note, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error) setMoves((data ?? []) as PointsMove[]);
  }

  async function redeemPoints() {
    if (!customer?.id || !loyalty) return;
    setPtsBusy(true);
    setPtsMsg(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.rpc("redeem_points");
    if (error) {
      setPtsBusy(false);
      setPtsMsg({
        bad: true,
        text: error.message.includes("not enough")
          ? t(locale, "sf.pts.errNotEnough", { r: loyalty.rewardPoints })
          : error.message.includes("paused")
            ? t(locale, "sf.pts.errPaused")
            : t(locale, "sf.pts.errGeneric"),
      });
      return;
    }
    const credit = ((Array.isArray(data) ? data[0] : data) as { credit_usd_cents?: number } | null)?.credit_usd_cents ?? 0;
    // fresh balances from the database (points and wallet moved together)
    const { data: fresh } = await supabase
      .from("customers")
      .select("balance_usd_cents, points_balance")
      .eq("id", customer.id)
      .maybeSingle();
    if (fresh) setCustomer((c) => (c ? { ...c, ...fresh } : c));
    await loadMoves(customer.id);
    setPtsBusy(false);
    setPtsMsg({ text: t(locale, "sf.pts.converted", { v: usdShort(credit) }) });
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace(lhref(locale, "/"));
  }

  if (!loaded) {
    return <div className="min-h-dvh bg-background" />;
  }

  const FIELD =
    "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors focus:border-foreground";
  const SAVE = "type-label h-11 shrink-0 bg-foreground px-8 text-background hover:opacity-90 disabled:opacity-40";
  const balance = (customer as { balance_usd_cents?: number })?.balance_usd_cents ?? 0;
  // undefined until the loyalty migration adds the column: the card stays hidden
  const points = (customer as { points_balance?: number } | null)?.points_balance;

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
        <p className="type-meta text-muted-foreground">{t(locale, "sf.acct.eyebrow")}</p>
        <h1 className="type-display mt-3 text-4xl sm:text-5xl">{customer?.full_name ?? t(locale, "sf.acct.welcome")}</h1>
        {customer && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t(locale, "sf.acct.since", {
              d: new Date(customer.created_at).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              t: tenure(locale, customer.created_at),
            })}
          </p>
        )}

        <div className="mt-10 border-t">
          <Row title={t(locale, "sf.acct.orders")} count={orders.length} open={openOrders}>
            {orders.length === 0 ? (
              <div>
                <p className="text-muted-foreground">{t(locale, "sf.acct.noOrders")}</p>
                <Link href={lhref(locale, "/shop")} className="type-label mt-4 inline-block underline underline-offset-4 hover:opacity-60">
                  {t(locale, "sf.acct.browse")}
                </Link>
              </div>
            ) : (
              <ul className="divide-y border-y">
                {orders.map((o) => (
                  <li key={o.id} className="py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="type-label tabular-nums" dir="ltr">
                          #{o.number}
                        </span>
                        <span className={`type-meta ${["cancelled", "returned"].includes(o.status) ? "text-muted-foreground" : ""}`}>
                          {statusLabel(locale, o.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                          {o.channel === "pos" ? t(locale, "sf.acct.inStore") : ""}
                        </span>
                      </div>
                      <span className="type-label tabular-nums">{usd(o.total_usd_cents)}</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {o.order_items.map((i, idx) => (
                        <li key={idx} dir="ltr" className={locale === "ar" ? "text-end" : undefined}>
                          {i.name_en} — {i.size} {i.color_en} × {i.quantity}
                        </li>
                      ))}
                    </ul>
                    {o.channel === "online" && (
                      <Link
                        href={lhref(locale, `/track?n=${o.number}`)}
                        className="type-meta me-6 mt-4 inline-block underline underline-offset-4 hover:opacity-60"
                      >
                        {t(locale, "sf.trackOrder.go")}
                      </Link>
                    )}
                    {["delivered", "completed"].includes(o.status) && o.channel === "online" && (
                      <Link
                        href={lhref(locale, `/returns?n=${o.number}`)}
                        className="type-meta mt-4 inline-block underline underline-offset-4 hover:opacity-60"
                      >
                        {t(locale, "sf.acct.requestReturn")}
                      </Link>
                    )}
                    {["pending", "confirmed", "picking"].includes(o.status) && o.channel === "online" && (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="type-meta underline underline-offset-4 hover:opacity-60"
                          onClick={async () => {
                            if (!window.confirm(t(locale, "sf.acct.cancelConfirm"))) return;
                            const { error } = await supabaseBrowser().rpc("customer_cancel_order", { p_order_id: o.id });
                            if (error) {
                              window.alert(t(locale, "sf.acct.cancelFailed"));
                              return;
                            }
                            setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: "cancelled" } : x)));
                          }}
                        >
                          {t(locale, "sf.acct.cancelOrder")}
                        </button>
                        <span className="text-xs text-muted-foreground">{t(locale, "sf.acct.cancelNote")}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Row>

          <LinkRow href={lhref(locale, "/cart?tab=favourites")} title={t(locale, "sf.cart.tabFav")} count={wishlist.length} />

          <Row title={t(locale, "sf.acct.details")}>
            <div className="space-y-10">
              {customer?.id && (
                <AccountProfile
                  part="details"
                  locale={locale}
                  customer={{ ...(customer as ProfileCustomer), email: customer.email ?? userEmail }}
                  onSaved={(patch) => setCustomer({ ...customer!, ...patch })}
                />
              )}
              <div>
                <p className="type-meta text-muted-foreground">{t(locale, "sf.acct.birthday")}</p>
                {customer?.birthday ? (
                  <p className="mt-1">
                    {t(locale, "sf.acct.birthdayHas", {
                      d: new Date(customer.birthday).toLocaleDateString(dateLocale, { day: "numeric", month: "long" }),
                    })}
                  </p>
                ) : customer?.id ? (
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground">{t(locale, "sf.acct.birthdayAsk")}</p>
                    <div className="mt-2 flex items-end gap-4">
                      <input type="date" className={FIELD} value={bdayInput} onChange={(e) => setBdayInput(e.target.value)} dir="ltr" />
                      <button
                        type="button"
                        className={SAVE}
                        disabled={!bdayInput}
                        onClick={async () => {
                          const { error } = await supabaseBrowser()
                            .from("customers")
                            .update({ birthday: bdayInput })
                            .eq("id", customer!.id!);
                          if (error) setBdayMsg(t(locale, "sf.acct.saveFailed"));
                          else {
                            setCustomer({ ...customer!, birthday: bdayInput });
                            setBdayMsg("");
                          }
                        }}
                      >
                        {t(locale, "sf.acct.save")}
                      </button>
                    </div>
                    {bdayMsg && <p className="mt-2 text-xs text-destructive">{bdayMsg}</p>}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t(locale, "sf.acct.birthdayUnlock")}</p>
                )}
              </div>
              <div>
                <p className="type-meta text-muted-foreground">{t(locale, "sf.acct.offers")}</p>
                <label className="mt-2 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] shrink-0 accent-foreground"
                    checked={customer?.marketing_consent ?? false}
                    disabled={!customer?.id}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setConsentError(false);
                      setCustomer((c) => (c ? { ...c, marketing_consent: next } : c));
                      const { error } = await supabaseBrowser()
                        .from("customers")
                        .update({ marketing_consent: next })
                        .eq("id", customer!.id!);
                      // consent must show what's actually stored: undo on failure
                      if (error) {
                        setCustomer((c) => (c ? { ...c, marketing_consent: !next } : c));
                        setConsentError(true);
                      }
                    }}
                  />
                  {t(locale, "sf.acct.offersLabel")}
                </label>
                {consentError && (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    {t(locale, "sf.acct.saveFailed")}
                  </p>
                )}
              </div>
            </div>
          </Row>

          {customer?.id && "size_top" in customer && (
            <Row title={t(locale, "sf.acct.sizes")}>
              <AccountProfile
                part="sizes"
                locale={locale}
                customer={{ ...(customer as ProfileCustomer), email: customer.email ?? userEmail }}
                onSaved={(patch) => setCustomer({ ...customer!, ...patch })}
              />
            </Row>
          )}

          <Row title="Wallet" meta={`$${(balance / 100).toFixed(2)}`}>
            <p className="text-xs text-muted-foreground">
              Pay any order fully from your wallet and get 10% off — the Whish prepay reward.
            </p>
            <p className="type-meta mt-8">Add funds via Whish</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Send the amount to BACH on Whish Money, then enter it here with the receipt number. We confirm within 6 hours max — taking longer?{" "}
              <a href="https://wa.me/96171566296" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
                WhatsApp us
              </a>
              .
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="block w-28">
                <span className="type-meta text-muted-foreground">Amount (USD)</span>
                <input dir="ltr" type="number" min="1" step="1" className={FIELD} value={tuAmount} onChange={(e) => setTuAmount(e.target.value)} />
              </label>
              <label className="block w-44">
                <span className="type-meta text-muted-foreground">Whish receipt no.</span>
                <input dir="ltr" className={FIELD} value={tuReceipt} onChange={(e) => setTuReceipt(e.target.value)} />
              </label>
              <button
                type="button"
                className={SAVE}
                disabled={tuBusy || !Number(tuAmount) || tuReceipt.trim().length < 3}
                onClick={async () => {
                  setTuBusy(true);
                  setTuMsg("");
                  const { error } = await supabaseBrowser().rpc("request_wallet_topup", {
                    p_amount_usd: Number(tuAmount),
                    p_receipt: tuReceipt.trim(),
                  });
                  setTuBusy(false);
                  if (error) {
                    setTuMsg(error.message.includes("pending") ? "You already have pending top-ups — wait for confirmation first." : "Something went wrong — try again or WhatsApp us.");
                    return;
                  }
                  setTuMsg("Received — we'll confirm within 6 hours max.");
                  setTuAmount("");
                  setTuReceipt("");
                  const { data: t2 } = await supabaseBrowser().from("wallet_topups").select("id, amount_usd_cents, receipt_no, status, created_at").order("created_at", { ascending: false }).limit(10);
                  setTopups(t2 ?? []);
                }}
              >
                {tuBusy ? "Sending…" : "Submit"}
              </button>
            </div>
            {tuMsg && <p className="mt-3 text-xs text-muted-foreground">{tuMsg}</p>}
            {topups.length > 0 && (
              <ul className="mt-6 divide-y border-y text-xs">
                {topups.map((tp) => (
                  <li key={tp.id} className="flex items-center justify-between gap-2 py-3">
                    <span className="tabular-nums">${(tp.amount_usd_cents / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground" dir="ltr">
                      #{tp.receipt_no}
                    </span>
                    <span className={tp.status === "rejected" ? "text-destructive" : tp.status === "confirmed" ? "" : "text-muted-foreground"}>
                      {tp.status === "pending" ? "awaiting confirmation" : tp.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Row>

          {loyalty && customer?.id && typeof points === "number" && (
            <Row title={t(locale, "sf.pts.title")} meta={`${points} ${ptsUnit(locale, points)}`}>
              <p className="type-label tabular-nums">
                {t(locale, "sf.pts.worth", { v: usdShort(rewardValue(points, loyalty)) })}
              </p>
              {(() => {
                const into = points % loyalty.rewardPoints;
                const left = loyalty.rewardPoints - into;
                return (
                  <div className="mt-6 max-w-md">
                    <p className="type-meta">
                      {t(locale, "sf.pts.toNext", { n: left, u: ptsUnit(locale, left), v: usdShort(loyalty.rewardUsdCents) })}
                    </p>
                    <div
                      className="mt-2 h-px w-full bg-foreground/15"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={loyalty.rewardPoints}
                      aria-valuenow={into}
                      aria-label={t(locale, "sf.pts.progress")}
                    >
                      <div
                        className="h-px bg-foreground transition-[width] duration-500 ease-out motion-reduce:transition-none"
                        style={{ width: `${Math.round((into / loyalty.rewardPoints) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              {points >= loyalty.rewardPoints && (
                <button type="button" className={`${SAVE} mt-6`} disabled={ptsBusy} onClick={() => void redeemPoints()}>
                  {ptsBusy
                    ? t(locale, "sf.pts.converting")
                    : t(locale, "sf.pts.convert", { v: usdShort(rewardValue(points, loyalty)) })}
                </button>
              )}
              {ptsMsg && (
                <p role="status" className={`mt-3 text-xs ${ptsMsg.bad ? "text-destructive" : "text-muted-foreground"}`}>
                  {ptsMsg.text}
                </p>
              )}
              <p className="mt-6 text-xs text-muted-foreground">{loyaltyRule(locale, loyalty)}</p>
              <p className="type-meta mt-8">{t(locale, "sf.pts.history")}</p>
              {moves.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.pts.none")}</p>
              ) : (
                <ul className="mt-3 divide-y border-y text-xs">
                  {moves.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {t(locale, `sf.pts.kind.${m.kind}`)}
                        {/* order references only; staff adjustment notes stay internal */}
                        {(m.kind === "earn" || m.kind === "reverse") && m.note ? (
                          <span className="text-muted-foreground" dir="ltr"> · {m.note}</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums" dir="ltr">
                        {m.delta > 0 ? "+" : "−"}
                        {Math.abs(m.delta)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Row>
          )}

          {userEmail && (
            <Row title={t(locale, "sf.acct.password")}>
              <AccountPassword locale={locale} email={userEmail} />
            </Row>
          )}

          {/* hidden until the two-step migration adds the column */}
          {customer?.id && userEmail && "two_step_email" in customer && (
            <Row
              title={t(locale, "sf.twostep.title")}
              meta={t(locale, (customer as { two_step_email?: boolean }).two_step_email ? "sf.twostep.on" : "sf.twostep.off")}
            >
              <AccountTwoStep
                locale={locale}
                customerId={customer.id}
                email={userEmail}
                enabled={Boolean((customer as { two_step_email?: boolean }).two_step_email)}
                onSaved={(on) => setCustomer((c) => (c ? { ...c, two_step_email: on } : c))}
              />
            </Row>
          )}

          {customer?.id && (
            <Row title={t(locale, "sf.privacy.title")}>
              <AccountPrivacy locale={locale} />
            </Row>
          )}

          <LinkRow href={lhref(locale, "/help")} title={t(locale, "sf.nav.help")} />

          <button
            type="button"
            onClick={() => void signOut()}
            className="type-label flex h-14 w-full items-center justify-between border-b text-start hover:opacity-60"
          >
            {t(locale, "sf.acct.signOut")}
          </button>
        </div>
      </main>
    </div>
  );
}

/** An uppercase row with a chevron that opens in place. */
function Row({
  title,
  count,
  meta,
  open,
  children,
}: {
  title: string;
  count?: number;
  meta?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b" open={open}>
      <summary className="type-label flex h-14 cursor-pointer list-none items-center justify-between gap-4 hover:opacity-60 [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count != null ? ` (${count})` : ""}
        </span>
        <span className="flex items-center gap-4">
          {meta ? <span className="tabular-nums">{meta}</span> : null}
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 rtl:-scale-x-100" strokeWidth={1} aria-hidden />
        </span>
      </summary>
      <div className="pb-10 pt-2 text-sm">{children}</div>
    </details>
  );
}

function LinkRow({ href, title, count }: { href: string; title: string; count?: number }) {
  return (
    <Link href={href} className="type-label flex h-14 items-center justify-between border-b hover:opacity-60">
      <span>
        {title}
        {count != null ? ` (${count})` : ""}
      </span>
      <ChevronRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1} aria-hidden />
    </Link>
  );
}
