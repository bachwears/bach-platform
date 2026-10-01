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
}: {
  orderId: string;
  currentStatus: string;
  channel: string;
}) {
  const router = useRouter();
  // In-store sales are complete at the till; only online orders move through steps.
  const options = channel === "online" ? (ALLOWED_TRANSITIONS[currentStatus] ?? []) : [];
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        <Button size="sm" disabled={!next || busy} onClick={() => void apply()}>
          {busy ? "عم نحدّث…" : "تحديث"}
        </Button>
      </div>
      {next === "packed" ? (
        <p className="text-xs text-muted-foreground">«جاهز» بينزّل القطع من المخزون (البيع بيتسجّل).</p>
      ) : next === "cancelled" ? (
        <p className="text-xs text-muted-foreground">الإلغاء بيرجّع القطع المحجوزة للمخزون.</p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
