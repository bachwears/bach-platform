"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../lib/locale-client";

interface Tracked {
  number: number;
  status: string;
  created_at: string;
  updated_at: string;
  total_usd_cents: number;
  payment: string | null;
  city: string | null;
  items: Array<{ name: string; size: string; color: string; qty: number }>;
}

// The path an online order walks; cancelled / returned are shown on their own.
const STEPS = ["pending", "confirmed", "picking", "packed", "shipped", "delivered"] as const;

const INPUT =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Guest order tracking: order number + the phone used at checkout. */
export default function TrackOrderPage() {
  const locale = useLocale();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Tracked | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n")?.replace(/\D/g, "") ?? "";
    if (n) setNumber(n);
    const supabase = supabaseBrowser();
    void supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session);
      if (!data.session || !n) return;
      // Signed in from the account page: the order is theirs, so fill in its phone and show it.
      const { data: own } = await supabase.from("orders").select("ship_phone").eq("number", Number(n)).maybeSingle();
      if (own?.ship_phone) {
        setPhone(own.ship_phone);
        void track(n, own.ship_phone);
      }
    });
    // runs once on load
  }, []);

  async function track(numberIn = number, phoneIn = phone) {
    const n = Number(numberIn.replace(/\D/g, ""));
    if (!n || phoneIn.replace(/\D/g, "").length < 7) return;
    setBusy(true);
    setError("");
    setOrder(null);
    const { data, error: err } = await supabaseBrowser().rpc("track_order", { p_number: n, p_phone: phoneIn });
    setBusy(false);
    if (err || !data) {
      setError(t(locale, "sf.trackOrder.notFound"));
      return;
    }
    setOrder(data as Tracked);
  }

  const stepIndex = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Beirut", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
        <h1 className="type-heading">{t(locale, "sf.trackOrder.title")}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.trackOrder.sub")}</p>
        {/* the account shortcut is for guests; a signed-in customer came from there */}
        {signedIn === false ? (
          <p className="mt-4 text-xs">
            <Link href={lhref(locale, "/account?open=orders")} className="underline underline-offset-4">
              {t(locale, "sf.trackOrder.account")}
            </Link>
          </p>
        ) : null}

        <form
          className="mt-10 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void track();
          }}
        >
          <label className="block">
            <span className="type-meta text-muted-foreground">{t(locale, "sf.trackOrder.number")}</span>
            <input
              className={INPUT}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              name="order-number"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="next"
              placeholder={t(locale, "sf.trackOrder.numberPh")}
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="type-meta text-muted-foreground">{t(locale, "sf.trackOrder.phone")}</span>
            <input
              className={INPUT}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              name="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="go"
              placeholder="+961 71 000 000"
              dir="ltr"
            />
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="submit"
            className="type-label h-12 w-full bg-foreground text-background hover:opacity-90 disabled:opacity-40"
            disabled={busy || !number.trim() || phone.replace(/\D/g, "").length < 7}
          >
            {busy ? "…" : t(locale, "sf.trackOrder.go")}
          </button>
        </form>

        {order ? (
          <section className="mt-14" aria-live="polite">
            <div className="flex items-baseline justify-between gap-4 border-b pb-4">
              <p className="type-label">#{order.number}</p>
              <p className="type-label">{t(locale, `sf.ostatus.${order.status}`)}</p>
            </div>

            {stepIndex >= 0 ? (
              <ol className="mt-8 space-y-4">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className={`h-3 w-3 shrink-0 border ${i <= stepIndex ? "border-foreground bg-foreground" : "border-border"}`}
                    />
                    <span className={`type-meta ${i <= stepIndex ? "" : "text-muted-foreground"}`}>
                      {t(locale, `sf.ostatus.${s}`)}
                    </span>
                    {i === stepIndex ? (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {dateFmt(order.updated_at)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 text-sm">{t(locale, "sf.trackOrder.closed")}</p>
            )}

            <ul className="mt-10 divide-y border-y">
              {order.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="type-meta block">{i.name}</span>
                    <span className="type-meta block text-muted-foreground">
                      {i.size} | {i.color} · × {i.qty}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="type-label mt-4 flex justify-between">
              <span>{t(locale, "sf.co.total")}</span>
              <span className="tabular-nums">{usd(order.total_usd_cents)}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
              {t(locale, "sf.trackOrder.placed")} {dateFmt(order.created_at)}
              {order.city ? ` · ${order.city}` : ""}
            </p>
            <p className="mt-8 text-xs text-muted-foreground">
              {t(locale, "sf.trackOrder.help")}{" "}
              <a href="https://wa.me/96171566296" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
                WhatsApp
              </a>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
