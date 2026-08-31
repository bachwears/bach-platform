"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Select } from "@bach/ui/components/select";

import { ALLOWED_TRANSITIONS, STATUS_LABELS } from "../lib/order-status";

export function OrderStatusControl({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const options = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">هالحالة نهائية — ما في تعديل.</p>;
  }

  async function apply() {
    if (!next) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser()
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", orderId);
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
