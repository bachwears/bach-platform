"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { HintDot, type HintContent } from "@bach/ui/components/hint-dot";
import { Icon } from "@bach/ui/components/icon";

interface Totals {
  ordersCount: number;
  gross: number;
  discounts: number;
  tva: number;
  cashInUsd: number;
  cashInLbp: number;
  cashOutUsd: number;
  cashOutLbp: number;
  creditUsed: number;
  returnsCount: number;
  /** online orders collected at this shop and paid in cash (part of cash in) */
  pickupUsd: number;
  pickupLbp: number;
  courierUsd: number;
  courierLbp: number;
}

interface Closeout {
  counted_usd_cents: number;
  counted_lbp: number;
  note: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
function lbp(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} LBP`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Eod({ branchId, branchName, hint }: { branchId: string; branchName: string; hint?: HintContent | null }) {
  const supabase = supabaseBrowser();
  const [date, setDate] = useState(todayStr());
  const [totals, setTotals] = useState<Totals | null>(null);
  const [existing, setExisting] = useState<Closeout | null>(null);
  const [countedUsd, setCountedUsd] = useState("");
  const [countedLbp, setCountedLbp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingOffline, setPendingOffline] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bach-pos-queue");
      const q = raw ? (JSON.parse(raw) as unknown[]) : [];
      setPendingOffline(Array.isArray(q) ? q.length : 0);
    } catch {
      setPendingOffline(0);
    }
  }, []);

  const load = useCallback(async () => {
    setError("");
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    const [ordersQ, paysQ, retsQ, closeQ, pickupQ, courierQ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, subtotal_usd_cents, discount_usd_cents, tva_usd_cents, status")
        .eq("channel", "pos")
        .eq("branch_id", branchId)
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString()),
      supabase
        .from("order_payments")
        .select("method, currency, amount_minor, orders!inner(channel, branch_id, created_at)")
        .eq("orders.channel", "pos")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", from.toISOString())
        .lt("orders.created_at", to.toISOString()),
      supabase
        .from("order_returns")
        .select("id, order_return_payments(direction, currency, amount_minor)")
        .eq("branch_id", branchId)
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString()),
      supabase
        .from("eod_closeouts")
        .select("counted_usd_cents, counted_lbp, note, created_at, profiles(full_name)")
        .eq("branch_id", branchId)
        .eq("business_date", date)
        .maybeSingle(),
      // Pickup orders paid in cash at the counter: the money is in this drawer,
      // counted on the day it was collected (not the day it was ordered).
      supabase
        .from("order_payments")
        .select("currency, amount_minor, orders!inner(channel, fulfilment, branch_id)")
        .eq("method", "cod")
        .eq("orders.channel", "online")
        .eq("orders.fulfilment", "pickup")
        .eq("orders.branch_id", branchId)
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString()),
      // Courier cash paid over and put in this drawer that day (MGMT → مصاري الشحن).
      supabase
        .from("courier_settlements")
        .select("usd_cents, lbp")
        .eq("destination", "drawer")
        .eq("branch_id", branchId)
        .eq("received_on", date),
    ]);

    const orders = ordersQ.data ?? [];
    const t: Totals = {
      ordersCount: orders.length,
      gross: orders.reduce((s, o) => s + o.subtotal_usd_cents, 0),
      discounts: orders.reduce((s, o) => s + o.discount_usd_cents, 0),
      tva: orders.reduce((s, o) => s + o.tva_usd_cents, 0),
      cashInUsd: 0,
      cashInLbp: 0,
      cashOutUsd: 0,
      cashOutLbp: 0,
      creditUsed: 0,
      returnsCount: (retsQ.data ?? []).length,
      pickupUsd: 0,
      pickupLbp: 0,
      courierUsd: 0,
      courierLbp: 0,
    };
    for (const p of pickupQ.data ?? []) {
      if (p.currency === "USD") t.pickupUsd += Number(p.amount_minor);
      else t.pickupLbp += Number(p.amount_minor);
    }
    t.cashInUsd += t.pickupUsd;
    t.cashInLbp += t.pickupLbp;
    for (const c of courierQ.data ?? []) {
      t.courierUsd += Number(c.usd_cents);
      t.courierLbp += Number(c.lbp);
    }
    t.cashInUsd += t.courierUsd;
    t.cashInLbp += t.courierLbp;
    for (const p of paysQ.data ?? []) {
      if (p.method === "credit") t.creditUsed += Number(p.amount_minor);
      else if (p.currency === "USD") t.cashInUsd += Number(p.amount_minor);
      else t.cashInLbp += Number(p.amount_minor);
    }
    for (const r of retsQ.data ?? []) {
      for (const p of (r.order_return_payments ?? []) as Array<{ direction: string; currency: string; amount_minor: number }>) {
        if (p.direction === "out") {
          if (p.currency === "USD") t.cashOutUsd += Number(p.amount_minor);
          else t.cashOutLbp += Number(p.amount_minor);
        }
      }
    }
    setTotals(t);
    setExisting((closeQ.data as unknown as Closeout) ?? null);
  }, [supabase, branchId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const expectedUsd = totals ? totals.cashInUsd - totals.cashOutUsd : 0;
  const expectedLbp = totals ? totals.cashInLbp - totals.cashOutLbp : 0;
  const cUsd = Math.round((parseFloat(countedUsd) || 0) * 100);
  const cLbp = Math.round(parseFloat(countedLbp.replace(/,/g, "")) || 0);
  const varUsd = cUsd - expectedUsd;
  const varLbp = cLbp - expectedLbp;

  async function close() {
    if (!totals || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("eod_closeouts").insert({
      branch_id: branchId,
      business_date: date,
      orders_count: totals.ordersCount,
      gross_usd_cents: totals.gross,
      discounts_usd_cents: totals.discounts,
      tva_usd_cents: totals.tva,
      cash_in_usd_cents: totals.cashInUsd,
      cash_in_lbp: totals.cashInLbp,
      cash_out_usd_cents: totals.cashOutUsd,
      cash_out_lbp: totals.cashOutLbp,
      expected_usd_cents: expectedUsd,
      expected_lbp: expectedLbp,
      counted_usd_cents: cUsd,
      counted_lbp: cLbp,
      note: note.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("duplicate")
          ? "هاليوم مسكّر من قبل — شوف التقرير تحت."
          : `ما مشي الحال: ${err.message}`,
      );
      void load();
      return;
    }
    void load();
  }

  const closed = existing != null;
  const showCountedUsd = closed ? existing.counted_usd_cents : cUsd;
  const showCountedLbp = closed ? existing.counted_lbp : cLbp;

  return (
    <div className="space-y-5">
      {pendingOffline > 0 && (
        <p className="border border-foreground px-4 py-2 text-sm print:hidden">
          <Icon name="lowStock" size={16} className="me-2 inline align-[-2px]" />
          في {pendingOffline} مبيعات أوفلاين لسا ما تزامنت — ارجع عشاشة الكاشير وزامنها قبل ما تسكّر اليوم،
          وإلا أرقام اليوم بتطلع ناقصة.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground" htmlFor="eod-date">
            اليوم
          </label>
          <Input id="eod-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-44" dir="ltr" />
        </div>
        {closed && (
          <span className="bg-secondary px-3 py-2 text-xs">
            اليوم مسكّر
            {existing.profiles?.full_name ? ` — ${existing.profiles.full_name}` : ""}
          </span>
        )}
      </div>

      {totals && (
        <div className="border p-4 sm:p-6 print:border-0 print:p-0" dir="ltr" id="eod-report">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-bach.png" alt="BACH" className="h-5 w-auto dark:invert print:invert-0" />
              <p className="text-sm text-muted-foreground">End of Day — {branchName}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-mono">{date}</p>
              <p className="text-muted-foreground">Printed {new Date().toLocaleString("en-GB")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Sales</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                <Row label="POS orders" value={String(totals.ordersCount)} />
                <Row label="Gross sales" value={usd(totals.gross)} />
                {totals.discounts > 0 && <Row label="Discounts" value={`- ${usd(totals.discounts)}`} />}
                {totals.tva > 0 && <Row label="TVA" value={usd(totals.tva)} />}
                {totals.creditUsed > 0 && <Row label="Exchange credit used" value={usd(totals.creditUsed)} />}
                <Row label="Returns / exchanges" value={String(totals.returnsCount)} />
              </dl>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Cash drawer
                {hint && <HintDot hint={hint} />}
              </h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                <Row label="Cash in (USD)" value={usd(totals.cashInUsd)} />
                {totals.pickupUsd > 0 && <Row label="incl. online pickups (USD)" value={usd(totals.pickupUsd)} />}
                {totals.pickupLbp > 0 && <Row label="incl. online pickups (LBP)" value={lbp(totals.pickupLbp)} />}
                {totals.courierUsd > 0 && <Row label="incl. courier cash paid in (USD)" value={usd(totals.courierUsd)} />}
                {totals.courierLbp > 0 && <Row label="incl. courier cash paid in (LBP)" value={lbp(totals.courierLbp)} />}
                <Row label="Cash in (LBP)" value={lbp(totals.cashInLbp)} />
                {(totals.cashOutUsd > 0 || totals.cashOutLbp > 0) && (
                  <>
                    <Row label="Refunds out (USD)" value={`- ${usd(totals.cashOutUsd)}`} />
                    <Row label="Refunds out (LBP)" value={`- ${lbp(totals.cashOutLbp)}`} />
                  </>
                )}
                <div className="border-t pt-1.5 font-medium">
                  <Row label="Expected (USD)" value={usd(expectedUsd)} />
                  <Row label="Expected (LBP)" value={lbp(expectedLbp)} />
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Count</h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <dl className="space-y-1.5 text-sm">
                <Row label="Counted (USD)" value={usd(showCountedUsd)} />
                <Row
                  label="Variance (USD)"
                  value={`${(closed ? existing.counted_usd_cents - expectedUsd : varUsd) >= 0 ? "+" : ""}${usd(closed ? existing.counted_usd_cents - expectedUsd : varUsd)}`}
                />
              </dl>
              <dl className="space-y-1.5 text-sm">
                <Row label="Counted (LBP)" value={lbp(showCountedLbp)} />
                <Row
                  label="Variance (LBP)"
                  value={`${(closed ? existing.counted_lbp - expectedLbp : varLbp) >= 0 ? "+" : ""}${lbp(closed ? existing.counted_lbp - expectedLbp : varLbp)}`}
                />
              </dl>
            </div>
            {(closed ? existing.note : note) && (
              <p className="mt-3 text-sm text-muted-foreground">Note: {closed ? existing.note : note}</p>
            )}
          </div>

          <div className="mt-10 hidden justify-between gap-10 text-xs text-muted-foreground print:flex">
            <span>Cashier signature: ____________________</span>
            <span>Manager signature: ____________________</span>
          </div>
        </div>
      )}

      {error && <p className="border border-destructive/40 px-4 py-2 text-sm text-destructive print:hidden">{error}</p>}

      {totals && !closed && (
        <div className="space-y-3 border p-4 print:hidden">
          <p className="text-sm font-medium">عدّ الدرج وسكّر اليوم</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="c-usd">
                الموجود دولار ($)
              </label>
              <Input id="c-usd" value={countedUsd} onChange={(e) => setCountedUsd(e.target.value)} className="h-11 text-left font-mono" inputMode="decimal" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="c-lbp">
                الموجود ليرة (ل.ل)
              </label>
              <Input id="c-lbp" value={countedLbp} onChange={(e) => setCountedLbp(e.target.value)} className="h-11 text-left font-mono" inputMode="numeric" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="c-note">
              ملاحظة (اختياري)
            </label>
            <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: سحبنا 20$ للمصاريف" />
          </div>
          {(countedUsd || countedLbp) && (
            <p className={`text-sm ${varUsd === 0 && varLbp === 0 ? "text-foreground" : "text-destructive"}`}>
              {varUsd === 0 && varLbp === 0
                ? "الدرج مظبوط تماماً."
                : `فرق: ${varUsd >= 0 ? "+" : ""}${usd(varUsd)} و ${varLbp >= 0 ? "+" : ""}${lbp(varLbp)}`}
            </p>
          )}
          <Button
            className="h-12 w-full"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`نسكّر يوم ${date}؟ بعد التسكير العدّ بينحفظ وما بيعود فيك تعدّلو.`)) void close();
            }}
          >
            {busy ? "عم نسكّر…" : "سكّر اليوم"}
          </Button>
        </div>
      )}

      {!totals && !error && <p className="p-8 text-center text-sm text-muted-foreground print:hidden">عم نجيب أرقام اليوم…</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
