"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Thumb } from "@bach/ui/components/thumb";

const REASONS = [
  { value: "purchase", label: "استلام بضاعة" },
  { value: "adjustment", label: "تصحيح" },
  { value: "count", label: "جرد" },
  { value: "transfer_in", label: "تحويل وارد" },
  { value: "transfer_out", label: "تحويل صادر" },
] as const;

export interface MovementVariant {
  id: string;
  name: string;
  size: string;
  color: string;
  sku: string;
  barcode?: string | null;
  photo?: string | null;
  /** quantity on hand per branch id */
  stock: Record<string, number>;
}

/** Arabic-Indic digits (٠-٩ / ۰-۹) as Latin, so a typed SKU or barcode still matches. */
const latin = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) - 0x0660) % 0x90 % 10));
const norm = (s: string) => latin(s).trim().toLowerCase();

/**
 * Like the POS search: a scanned / typed barcode or SKU picks its piece at once;
 * words (name, colour, size, SKU) list up to 8 matches to choose from.
 */
function findVariants(variants: MovementVariant[], query: string, exact: boolean): MovementVariant[] {
  const q = norm(query);
  if (!q) return [];
  if (exact) {
    const hit = variants.find((v) => v.barcode?.toLowerCase() === q || v.sku.toLowerCase() === q);
    if (hit) return [hit];
  }
  const words = q.split(/\s+/);
  return variants
    .filter((v) => {
      const text = `${v.name} ${v.sku} ${v.barcode ?? ""} ${v.color} ${v.size}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .slice(0, 8);
}

export function MovementForm({
  variants,
  branches,
}: {
  variants: MovementVariant[];
  branches: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => (query.trim().length >= 2 ? findVariants(variants, query, false) : []), [variants, query]);
  const chosen = variants.find((v) => v.id === variantId);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(v: MovementVariant) {
    setVariantId(v.id);
    setQuery("");
    setOpen(false);
    setError(null);
    document.getElementById("m-delta")?.focus();
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length : 0));
    } else if (e.key === "Enter") {
      // a scanner types the code and presses Enter
      e.preventDefault();
      const exact = findVariants(variants, query, true);
      const pick = exact.length === 1 ? exact[0] : open ? results[active] : undefined;
      if (pick) choose(pick);
      else if (query.trim()) setError("ما لقينا قطعة بهالباركود أو الاسم.");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [reason, setReason] = useState<string>("purchase");
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!variantId) {
      setError("اختار القطعة أول — امسح الباركود أو فتّش بالاسم.");
      searchRef.current?.focus();
      return;
    }
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
    // ready for the next piece: scan, quantity, Enter
    setDelta("");
    setVariantId("");
    requestAnimationFrame(() => searchRef.current?.focus());
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid items-end gap-3 border p-4 sm:grid-cols-5">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="m-variant">القطعة (مقاس ولون)</Label>
        {chosen ? (
          <div className="flex min-h-10 items-center gap-3 border px-2 py-1">
            <Thumb src={chosen.photo} size="sm" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate">
                {chosen.name} — {chosen.size} {chosen.color}
              </span>
              <span className="block text-xs text-muted-foreground" dir="ltr">
                {chosen.sku} · {chosen.stock[branchId] ?? 0}
              </span>
            </span>
            <button
              type="button"
              className="shrink-0 px-2 text-xs underline underline-offset-4"
              onClick={() => {
                setVariantId("");
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              غيّر
            </button>
          </div>
        ) : (
          <div ref={boxRef} className="relative">
            <Input
              ref={searchRef}
              id="m-variant"
              value={query}
              autoComplete="off"
              placeholder="امسح الباركود أو فتّش بالاسم / SKU…"
              role="combobox"
              aria-expanded={open && results.length > 0}
              aria-controls="m-variant-list"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(0);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onSearchKey}
            />
            {open && results.length > 0 ? (
              <ul id="m-variant-list" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-[50vh] overflow-y-auto border bg-background">
                {results.map((v, i) => (
                  <li key={v.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      className={`flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-right hover:bg-muted ${i === active ? "bg-muted" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(v)}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Thumb src={v.photo} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {v.name} — {v.size} {v.color}
                          </span>
                          <span className="block text-xs text-muted-foreground" dir="ltr">
                            {v.sku}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">بالفرع: {v.stock[branchId] ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : open && query.trim().length >= 2 ? (
              <p className="absolute inset-x-0 top-full z-20 mt-1 border bg-background px-3 py-2 text-sm text-muted-foreground">ما في نتايج</p>
            ) : null}
          </div>
        )}
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
        <p className="text-xs text-muted-foreground">+ للزيادة، − للنقص</p>
      </div>
      <Button type="submit" disabled={busy} className="sm:col-span-5 sm:justify-self-start">
        {busy ? "عم نسجّل…" : "سجّل الحركة"}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-5">{error}</p> : null}
    </form>
  );
}
