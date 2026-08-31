"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

export function RateForm({ currentRate }: { currentRate: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmBig, setConfirmBig] = useState(false);

  const parsed = Math.round(parseFloat(value.replace(/,/g, "")) || 0);
  const changePct = currentRate && parsed > 0 ? ((parsed - currentRate) / currentRate) * 100 : 0;
  const bigJump = currentRate != null && parsed > 0 && Math.abs(changePct) > 20;

  async function save() {
    if (parsed <= 0 || busy) return;
    if (bigJump && !confirmBig) {
      setConfirmBig(true);
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().from("exchange_rates").insert({ lbp_per_usd: parsed });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("policy")
          ? "دورك ما بيسمح بتحديد سعر الصرف — بس السوبر أدمن ومدير المحل."
          : `ما مشي الحال: ${err.message}`,
      );
      return;
    }
    setValue("");
    setConfirmBig(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">حدّد سعر جديد</p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setConfirmBig(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          placeholder="مثلاً 90000"
          className="text-left font-mono"
          inputMode="numeric"
        />
        <Button disabled={parsed <= 0 || busy} onClick={() => void save()}>
          {busy ? "عم نسجّل…" : confirmBig ? "أكيد؟ سجّل" : "تسجيل"}
        </Button>
      </div>
      {parsed > 0 && currentRate != null && (
        <p className={`text-sm ${bigJump ? "text-destructive" : "text-muted-foreground"}`}>
          {changePct === 0
            ? "نفس السعر الحالي."
            : `${changePct > 0 ? "ارتفاع" : "انخفاض"} ${Math.abs(changePct).toFixed(1)}% عن السعر الحالي${bigJump ? " — تغيير كبير، تأكّد قبل ما تسجّل." : ""}`}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        السعر الجديد بيمشي فوراً على الكاشير والمتجر. كل فاتورة بتحتفظ بالسعر يلي انعملت فيه — التاريخ ما بيتغيّر.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
