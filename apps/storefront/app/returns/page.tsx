"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Textarea } from "@bach/ui/components/textarea";
import { t, type Locale } from "@bach/i18n";

import { lhref, useLocale } from "../../lib/locale-client";

interface LookupItem {
  order_item_id: string;
  name_en: string;
  size: string;
  color_en: string;
  quantity: number;
}

interface Lookup {
  order_number: number;
  order_status: string;
  ordered_at: string;
  eligible: boolean;
  ineligible_reason: string | null;
  items: LookupItem[];
  requests: Array<{ kind: string; status: string; created_at: string }>;
}

function reqStatus(locale: Locale, status: string) {
  const label = t(locale, `sf.ret.status.${status}`);
  return label === `sf.ret.status.${status}` ? status : label;
}

function ReturnsForm() {
  const locale = useLocale();
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("n") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Lookup | null>(null);
  const [kind, setKind] = useState<"return" | "exchange">("return");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [exchangeNote, setExchangeNote] = useState("");
  const [done, setDone] = useState(false);

  const dateLocale = locale === "ar" ? "ar-LB" : "en-GB";

  async function lookup() {
    const n = parseInt(number.replace(/[^0-9]/g, ""), 10);
    if (!n || phone.replace(/[^0-9+]/g, "").length < 7 || busy) return;
    setBusy(true);
    setError("");
    setOrder(null);
    setSelected({});
    const { data, error: err } = await supabaseBrowser().rpc("lookup_order_for_return", {
      p_number: n,
      p_phone: phone,
    });
    setBusy(false);
    if (err || !data?.length) {
      setError(t(locale, "sf.ret.notFound"));
      return;
    }
    setOrder(data[0] as unknown as Lookup);
  }

  const chosenItems = Object.entries(selected).filter(([, q]) => q > 0);
  const canSubmit =
    !busy && order?.eligible && chosenItems.length > 0 && reason.trim() && (kind !== "exchange" || exchangeNote.trim());

  async function submit() {
    if (!canSubmit || !order) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().rpc("submit_return_request", {
      p_number: order.order_number,
      p_phone: phone,
      p_kind: kind,
      p_reason: reason.trim(),
      p_items: chosenItems.map(([order_item_id, quantity]) => ({ order_item_id, quantity })),
      p_exchange_note: kind === "exchange" ? exchangeNote.trim() : null,
    });
    setBusy(false);
    if (err) {
      setError(t(locale, "sf.ret.failed"));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t(locale, "sf.ret.doneEyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t(locale, "sf.ret.doneTitle")}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.ret.doneBody")}</p>
          <Link href={lhref(locale, "/shop")} className="mt-8 inline-block underline underline-offset-4">
            {t(locale, "sf.confirmed.continue")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.ret.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.ret.sub")}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t(locale, "sf.ret.orderNo")}
          inputMode="numeric"
          dir="ltr"
          className="w-32 font-mono"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+961 71 000 000"
          inputMode="tel"
          dir="ltr"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && void lookup()}
        />
        <Button disabled={busy} onClick={() => void lookup()}>
          {busy && !order ? "…" : t(locale, "sf.ret.find")}
        </Button>
      </div>
      {error && !order && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {order && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono font-medium" dir="ltr">#{order.order_number}</span>
            <span className="text-muted-foreground">
              {new Date(order.ordered_at).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {order.requests.length > 0 && (
            <div className="rounded-md border p-4 text-sm">
              <p className="font-medium">{t(locale, "sf.ret.existing")}</p>
              <ul className="mt-2 space-y-1">
                {order.requests.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="secondary">{reqStatus(locale, r.status)}</Badge>
                    {r.kind === "exchange" ? t(locale, "sf.ret.kindExchange") : t(locale, "sf.ret.kindReturn")}
                    {" · "}
                    {new Date(r.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!order.eligible ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {t(locale, `sf.ret.reason.${order.ineligible_reason}`)}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t(locale, "sf.ret.kind")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["return", "exchange"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`rounded-md border p-3 text-start text-sm transition-colors ${
                        kind === k ? "border-foreground" : "hover:border-foreground/50"
                      }`}
                    >
                      <span className="font-medium">
                        {t(locale, k === "return" ? "sf.ret.kindReturn" : "sf.ret.kindExchange")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(locale, k === "return" ? "sf.ret.kindReturnSub" : "sf.ret.kindExchangeSub")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t(locale, "sf.ret.items")}</p>
                <ul className="divide-y rounded-md border">
                  {order.items.map((it) => {
                    const qty = selected[it.order_item_id] ?? 0;
                    return (
                      <li key={it.order_item_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={qty > 0}
                            onChange={(e) =>
                              setSelected({ ...selected, [it.order_item_id]: e.target.checked ? 1 : 0 })
                            }
                          />
                          <span dir="ltr" className={locale === "ar" ? "text-end" : undefined}>
                            {it.name_en} — {it.size} {it.color_en}
                          </span>
                        </label>
                        {it.quantity > 1 && qty > 0 && (
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t(locale, "sf.ret.qty")}</span>
                            <select
                              value={qty}
                              onChange={(e) => setSelected({ ...selected, [it.order_item_id]: Number(e.target.value) })}
                              className="rounded-md border bg-transparent px-2 py-1"
                            >
                              {Array.from({ length: it.quantity }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{t(locale, "sf.ret.reasonLabel")}</span>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t(locale, "sf.ret.reasonPh")}
                />
              </label>

              {kind === "exchange" && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t(locale, "sf.ret.exchangeNote")}</span>
                  <Input
                    value={exchangeNote}
                    onChange={(e) => setExchangeNote(e.target.value)}
                    placeholder={t(locale, "sf.ret.exchangeNotePh")}
                  />
                </label>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="h-12 w-full text-base" disabled={!canSubmit} onClick={() => void submit()}>
                {busy ? t(locale, "sf.ret.submitting") : t(locale, "sf.ret.submit")}
              </Button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

export default function ReturnsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense>
        <ReturnsForm />
      </Suspense>
    </div>
  );
}
