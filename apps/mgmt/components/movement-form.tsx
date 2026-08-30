"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";

const REASONS = [
  { value: "purchase", label: "استلام بضاعة" },
  { value: "adjustment", label: "تصحيح" },
  { value: "count", label: "جرد" },
  { value: "transfer_in", label: "تحويل وارد" },
  { value: "transfer_out", label: "تحويل صادر" },
] as const;

export function MovementForm({
  variants,
  branches,
}: {
  variants: Array<{ id: string; label: string }>;
  branches: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [reason, setReason] = useState<string>("purchase");
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const d = parseInt(delta, 10);
    if (!Number.isInteger(d) || d === 0) {
      setError("الكمية لازم تكون رقم غير صفر (موجب لزيادة، سالب لنقص)");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error: insertError } = await supabase.from("inventory_movements").insert({
      variant_id: variantId,
      branch_id: branchId,
      delta: d,
      reason,
      created_by: userId,
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23514"
          ? "الحركة بتخلي المخزون بالسالب — ما فينا ننزل تحت الصفر"
          : "ما زبط: " + insertError.message,
      );
      return;
    }
    setDelta("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid items-end gap-3 rounded-md border p-4 sm:grid-cols-5">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="m-variant">الفاريانت</Label>
        <Select id="m-variant" required value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          <option value="">اختار…</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-branch">الفرع</Label>
        <Select id="m-branch" required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-reason">السبب</Label>
        <Select id="m-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-delta">الكمية (±)</Label>
        <Input id="m-delta" dir="ltr" type="number" required placeholder="+10" value={delta} onChange={(e) => setDelta(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="sm:col-span-5 sm:justify-self-start">
        {busy ? "عم نسجّل…" : "سجّل الحركة"}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-5">{error}</p> : null}
    </form>
  );
}
