"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Select } from "@bach/ui/components/select";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";

interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Found {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_en: string;
  name: string;
  /** on hand minus reserved, per branch */
  available: Record<string, number>;
}

interface Line extends Found {
  qty: string;
}

type VariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_en: string;
  products: { name_en: string } | null;
  inventory_levels: Array<{ branch_id: string; quantity: number; reserved: number }> | null;
};

const SELECT = "id, product_id, sku, barcode, size, color_en, products!inner(name_en), inventory_levels(branch_id, quantity, reserved)";

function toFound(v: VariantRow): Found {
  const available: Record<string, number> = {};
  for (const l of v.inventory_levels ?? []) available[l.branch_id] = l.quantity - l.reserved;
  return { id: v.id, product_id: v.product_id, sku: v.sku, barcode: v.barcode, size: v.size, color_en: v.color_en, name: v.products?.name_en ?? "", available };
}

const branchLabel = (b: Branch) => b.name_ar || b.name;

/** Move stock between branches: one transfer = paired out/in movements (transfer_stock RPC). */
export function BranchTransfer({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(branches[0]?.id ?? "");
  const [to, setTo] = useState(branches[1]?.id ?? "");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  useEffect(() => {
    void loadFrontPhotos(supabaseBrowser()).then(setPhotos);
  }, []);

  // search: SKU / barcode / product name (debounced)
  useEffect(() => {
    const t = q.trim().replace(/[,()%*\\]/g, " ").trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const supabase = supabaseBrowser();
      const [byCode, byName] = await Promise.all([
        supabase.from("product_variants").select(SELECT).or(`sku.ilike.%${t}%,barcode.eq.${t}`).limit(20),
        supabase.from("product_variants").select(SELECT).ilike("products.name_en", `%${t}%`).limit(20),
      ]);
      const seen = new Set<string>();
      const merged: Found[] = [];
      for (const v of [...(byCode.data ?? []), ...(byName.data ?? [])] as unknown as VariantRow[]) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        merged.push(toFound(v));
      }
      setResults(merged.slice(0, 25));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const availFrom = (f: Found) => f.available[from] ?? 0;

  function add(f: Found) {
    setDone("");
    setLines((cur) => (cur.some((l) => l.id === f.id) ? cur : [...cur, { ...f, qty: "1" }]));
    setQ("");
    setResults([]);
  }

  const parsed = lines.map((l) => ({ line: l, qty: parseInt(l.qty, 10) }));
  const invalid = parsed.some(({ line, qty }) => !Number.isInteger(qty) || qty < 1 || qty > availFrom(line));
  const canSubmit = !busy && from && to && from !== to && lines.length > 0 && !invalid;
  const totalPieces = parsed.reduce((s, p) => s + (Number.isInteger(p.qty) ? p.qty : 0), 0);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    setDone("");
    const { data, error: err } = await supabaseBrowser().rpc("transfer_stock", {
      p_from: from,
      p_to: to,
      p_items: parsed.map(({ line, qty }) => ({ variant_id: line.id, quantity: qty })),
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (err) {
      const m = err.message;
      setError(
        /insufficient stock for (.+)/.test(m)
          ? `الكمية ما بتكفي بالفرع المرسِل: ${m.replace(/.*insufficient stock for /, "")} — حدّث الصفحة وجرّب.`
          : /not allowed/.test(m)
            ? "دورك ما بيسمح بالتحويل — للمدير أو مسؤول المخزون."
            : `ما مشي التحويل: ${m}`,
      );
      return;
    }
    setDone(`تمّ التحويل (${totalPieces} قطعة) — المرجع ${String(data).slice(0, 8)}.`);
    setLines([]);
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-4 border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="tr-from">من فرع</Label>
          <Select id="tr-from" value={from} onChange={(e) => setFrom(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {branchLabel(b)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tr-to">لفرع</Label>
          <Select id="tr-to" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">اختار…</option>
            {branches
              .filter((b) => b.id !== from)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {branchLabel(b)}
                </option>
              ))}
          </Select>
        </div>
      </div>

      <div className="relative space-y-1">
        <Label htmlFor="tr-search">زيد قطعة</Label>
        <Input
          id="tr-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU، باركود أو اسم القطعة…"
          autoComplete="off"
        />
        {results.length > 0 ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto border bg-background">
            {results.map((f) => {
              const a = availFrom(f);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={a < 1}
                    onClick={() => add(f)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted disabled:opacity-40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Thumb src={photoFor(photos, f.product_id, f.color_en)} size="md" />
                      <span dir="ltr" className="min-w-0 truncate">
                        {f.name} — {f.size} {f.color_en}
                        <span className="ms-2 font-mono text-xs text-muted-foreground">{f.sku}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">متوفّر {a}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2 text-start font-normal">القطعة</th>
              <th className="p-2 text-start font-normal">متوفّر</th>
              <th className="p-2 text-start font-normal">الكمية</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {parsed.map(({ line, qty }) => {
              const a = availFrom(line);
              const bad = !Number.isInteger(qty) || qty < 1 || qty > a;
              return (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="p-2">
                    <span className="flex items-center gap-3">
                      <Thumb src={photoFor(photos, line.product_id, line.color_en)} size="sm" />
                      <span dir="ltr" className="min-w-0">
                        {line.name} — {line.size} {line.color_en}
                        <span className="block font-mono text-xs text-muted-foreground">{line.sku}</span>
                      </span>
                    </span>
                  </td>
                  <td className="p-2 font-mono">{a}</td>
                  <td className="p-2">
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      className={`h-9 w-20 font-mono ${bad ? "border-destructive" : ""}`}
                      value={line.qty}
                      onChange={(e) =>
                        setLines((cur) => cur.map((l) => (l.id === line.id ? { ...l, qty: e.target.value.replace(/\D/g, "") } : l)))
                      }
                    />
                  </td>
                  <td className="p-2 text-end">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => setLines((cur) => cur.filter((l) => l.id !== line.id))}
                    >
                      شيل
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">لسّا ما زدت قطع — دوّر بالخانة فوق واكبس على القطعة لتزيدها.</p>
      )}

      <div className="space-y-1">
        <Label htmlFor="tr-note">ملاحظة (اختياري)</Label>
        <Input id="tr-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: تعبئة الفرع قبل الويكند" />
      </div>

      {invalid ? <p className="text-xs text-destructive">في كمية أكبر من المتوفّر بالفرع المرسِل أو مش رقم صحيح.</p> : null}
      {from && to && from === to ? <p className="text-xs text-destructive">اختار فرعين مختلفين.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {done ? <p className="text-sm">{done}</p> : null}

      <Button disabled={!canSubmit} onClick={() => void submit()}>
        {busy ? "عم نحوّل…" : `حوّل ${totalPieces || ""} قطعة`.replace("  ", " ")}
      </Button>
    </div>
  );
}

/** Super admin only: add a branch (name EN/AR, address). Trivial on purpose — edits stay in the database. */
export function AddBranch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser()
      .from("branches")
      .insert({ name: name.trim(), name_ar: nameAr.trim() || null, address: address.trim() || null })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: `ما انضاف: ${error.message}` });
      return;
    }
    setMsg({ ok: true, text: "انضاف الفرع — صار فيك تحوّل له، وبيظهر بالـPOS وقت الدخول." });
    setName("");
    setNameAr("");
    setAddress("");
    router.refresh();
  }

  return (
    <details className="border p-4">
      <summary className="cursor-pointer text-sm font-medium">زيد فرع جديد (سوبر أدمن)</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="br-name">الاسم (بالإنكليزي)</Label>
          <Input id="br-name" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jounieh" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="br-name-ar">الاسم (بالعربي)</Label>
          <Input id="br-name-ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="br-address">العنوان</Label>
          <Input id="br-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        الفرع الجديد بيبلّش بلا مخزون — حوّل له من الفرع الرئيسي من هون. طلبات الموقع بتضل تنسحب من الفرع الرئيسي.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" disabled={busy || !name.trim()} onClick={() => void save()}>
          {busy ? "عم نضيف…" : "زيد الفرع"}
        </Button>
        {msg ? <span className={`text-xs ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</span> : null}
      </div>
    </details>
  );
}
