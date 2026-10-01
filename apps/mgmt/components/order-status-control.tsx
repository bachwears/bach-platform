"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Select } from "@bach/ui/components/select";

import { ALLOWED_TRANSITIONS, STATUS_LABELS } from "../lib/order-status";

export function OrderStatusControl({
  orderId,
  currentStatus,
  channel,
  paymentMethod = null,
  totalUsdCents = 0,
  lbpPerUsd = 0,
}: {
  orderId: string;
  currentStatus: string;
  channel: string;
  paymentMethod?: string | null;
  totalUsdCents?: number;
  lbpPerUsd?: number;
}) {
  const router = useRouter();
  // In-store sales are complete at the till; only online orders move through steps.
  const options = channel === "online" ? (ALLOWED_TRANSITIONS[currentStatus] ?? []) : [];
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Cash on delivery: what the courier actually collected (defaults to the total in USD).
  const [paidUsd, setPaidUsd] = useState((totalUsdCents / 100).toFixed(2));
  const [paidLbp, setPaidLbp] = useState("");
  const collecting = next === "delivered" && paymentMethod === "cod";
  const usdCents = Math.round((parseFloat(paidUsd) || 0) * 100);
  const lbpAmt = Math.round(parseFloat(paidLbp.replace(/,/g, "")) || 0);
  const collectedCents = usdCents + (lbpPerUsd > 0 ? Math.round((lbpAmt / lbpPerUsd) * 100) : 0);
  const shortBy = totalUsdCents - collectedCents;

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {["delivered", "completed"].includes(currentStatus) || channel !== "online" ? (
          <>
            ما في خطوة تانية للحالة. للإرجاع أو التبديل: وافق على طلب الزبون من{" "}
            <a href="/returns" className="underline underline-offset-2">
              صفحة الإرجاع
            </a>
            ، وسجّل الإرجاع نفسه من شاشة المرتجعات بنقطة البيع — هيك المخزون والمبلغ بيرجعوا صح.
          </>
        ) : (
          "هالحالة نهائية — ما في تعديل."
        )}
      </p>
    );
  }

  async function apply() {
    if (!next) return;
    setBusy(true);
    setError("");
    // The RPC checks the step and moves stock (packed = sale, cancelled = release).
    const { error: err } = await supabaseBrowser().rpc("advance_online_order", {
      p_order_id: orderId,
      p_next: next,
      ...(collecting ? { p_paid_usd_cents: usdCents, p_paid_lbp: lbpAmt } : {}),
    });
    setBusy(false);
    if (err) {
      setError(`ما مشي التعديل: ${err.message}`);
      return;
    }
    router.refresh();
    setNext("");
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">تغيير الحالة</p>
      <div className="flex gap-2">
        <Select value={next} onChange={(e) => setNext(e.target.value)} className="h-9 flex-1">
          <option value="">اختار الحالة الجديدة…</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button size="sm" disabled={!next || busy || (collecting && shortBy > 5)} onClick={() => void apply()}>
          {busy ? "عم نحدّث…" : "تحديث"}
        </Button>
      </div>
      {collecting ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium">شو قبض المندوب؟</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              دولار ($)
              <input
                dir="ltr"
                inputMode="decimal"
                value={paidUsd}
                onChange={(e) => setPaidUsd(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              ليرة (ل.ل)
              <input
                dir="ltr"
                inputMode="numeric"
                value={paidLbp}
                onChange={(e) => setPaidLbp(e.target.value)}
                placeholder="0"
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              />
            </label>
          </div>
          <p className={`text-xs ${shortBy > 5 ? "text-destructive" : "text-muted-foreground"}`}>
            {shortBy > 5
              ? `ناقص $${(shortBy / 100).toFixed(2)} عن مجموع الطلب.`
              : "بيتسجّل كدفعة «كاش عند التسليم» — ما بيدخل بحساب درج المحل."}
          </p>
        </div>
      ) : null}
      {next === "packed" ? (
        <p className="text-xs text-muted-foreground">«جاهز» بينزّل القطع من المخزون (البيع بيتسجّل).</p>
      ) : next === "cancelled" ? (
        <p className="text-xs text-muted-foreground">الإلغاء بيرجّع القطع المحجوزة للمخزون.</p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
