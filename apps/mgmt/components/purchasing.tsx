"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";
import { Icon } from "@bach/ui/components/icon";

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  ordered: "مطلوب",
  partial: "استلام جزئي",
  received: "مستلم",
  cancelled: "ملغى",
};

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
}

interface PoItem {
  variant_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_usd_cents: number | null;
  product_variants: { sku: string | null; size: string; color_en: string; product_id: string; products: { name_en: string } };
}

interface Po {
  id: string;
  number: number;
  status: string;
  note: string | null;
  expected_at: string | null;
  created_at: string;
  suppliers: { name: string };
  purchase_order_items: PoItem[];
}

interface DraftLine {
  variant_id: string;
  product_id: string;
  color_en: string;
  label: string;
  sku: string | null;
  quantity: number;
  cost: string; // dollars, free text
}

interface SearchHit {
  id: string;
  product_id: string;
  sku: string | null;
  size: string;
  color_en: string;
  products: { name_en: string };
}

export function Purchasing({ branchId }: { branchId: string }) {
  const supabase = supabaseBrowser();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<Po[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // supplier form
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");

  // new PO form
  const [poSupplier, setPoSupplier] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [poNote, setPoNote] = useState("");

  // receiving inputs keyed `${poId}:${variantId}`
  const [recv, setRecv] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  useEffect(() => {
    void loadFrontPhotos(supabaseBrowser()).then(setPhotos);
  }, []);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("suppliers").select("id, name, phone, is_active").order("name"),
      supabase
        .from("purchase_orders")
        .select(
          "id, number, status, note, expected_at, created_at, suppliers(name), purchase_order_items(variant_id, quantity_ordered, quantity_received, unit_cost_usd_cents, product_variants(sku, size, color_en, product_id, products(name_en)))",
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setSuppliers((s ?? []) as Supplier[]);
    setPos((p ?? []) as unknown as Po[]);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSupplier() {
    if (!supName.trim()) return;
    const { error: err } = await supabase
      .from("suppliers")
      .insert({ name: supName.trim(), phone: supPhone.trim() || null });
    if (err) setError("ما انضاف المورّد.");
    else {
      setSupName("");
      setSupPhone("");
      void load();
    }
  }

  async function searchVariants(text: string) {
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const q = text.trim().replace(/[,()%*\\]/g, " ").trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const select = "id, product_id, sku, size, color_en, products!inner(name_en)";
    const { data: skuHits } = await supabase
      .from("product_variants")
      .select(select)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(6);
    let hits = (skuHits ?? []) as unknown as SearchHit[];
    if (!hits.length) {
      const { data: prods } = await supabase.from("products").select("id").ilike("name_en", `%${q}%`).limit(4);
      if (prods?.length) {
        const { data: nameHits } = await supabase
          .from("product_variants")
          .select(select)
          .eq("is_active", true)
          .in("product_id", prods.map((x) => x.id))
          .limit(6);
        hits = (nameHits ?? []) as unknown as SearchHit[];
      }
    }
    setResults(hits);
  }

  function addLine(v: SearchHit) {
    setQuery("");
    setResults([]);
    setLines((prev) =>
      prev.some((l) => l.variant_id === v.id)
        ? prev
        : [
            ...prev,
            {
              variant_id: v.id,
              product_id: v.product_id,
              color_en: v.color_en,
              label: `${v.products.name_en} — ${v.size} ${v.color_en}`,
              sku: v.sku,
              quantity: 1,
              cost: "",
            },
          ],
    );
  }

  async function createPo(placeNow: boolean) {
    if (!poSupplier || !lines.length || busy) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("po_create", {
      p_supplier_id: poSupplier,
      p_branch_id: branchId,
      p_items: lines.map((l) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        unit_cost_usd_cents: l.cost.trim() ? Math.round(parseFloat(l.cost) * 100) : null,
      })),
      p_note: poNote.trim() || null,
    });
    let placeErr: { message: string } | null = null;
    if (!err && placeNow && data?.[0]) {
      ({ error: placeErr } = await supabase.rpc("po_place", { p_po_id: data[0].po_id }));
    }
    setBusy(false);
    if (err) {
      setError(`ما انعمل الطلب: ${err.message}`);
      return;
    }
    // the PO exists either way — clear the form, but say it stayed a draft
    if (placeErr) setError(`انحفظ الطلب كمسودة بس ما انبعت: ${placeErr.message}`);
    setLines([]);
    setPoNote("");
    void load();
  }

  async function receive(po: Po) {
    const items = po.purchase_order_items
      .map((it) => ({
        variant_id: it.variant_id,
        quantity: parseInt(recv[`${po.id}:${it.variant_id}`] ?? "", 10) || 0,
      }))
      .filter((x) => x.quantity > 0);
    if (!items.length || busy) return;
    setBusy(true);
    const { error: err } = await supabase.rpc("po_receive", { p_po_id: po.id, p_items: items });
    setBusy(false);
    if (err) {
      setError(`ما مشي الاستلام: ${err.message}`);
      return;
    }
    setRecv({});
    setError("");
    void load();
  }

  return (
    <div className="space-y-8">
      {error && <p className="bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      {/* Suppliers */}
      <section className="border p-4">
        <h2 className="flex items-center gap-2 font-medium"><Icon name="courier" size={18} className="text-muted-foreground" />الموردين</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="po-sup-name" className="block text-sm">اسم المورّد</label>
            <Input id="po-sup-name" value={supName} onChange={(e) => setSupName(e.target.value)} className="h-9 w-56" />
          </div>
          <div className="space-y-1">
            <label htmlFor="po-sup-phone" className="block text-sm">التلفون (اختياري)</label>
            <Input id="po-sup-phone" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="+961…" className="h-9 w-40" dir="ltr" />
          </div>
          <Button size="sm" disabled={!supName.trim()} onClick={() => void addSupplier()}>
            زيد المورّد
          </Button>
        </div>
        {suppliers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">ما في موردين بعد — زيد أول مورّد لتقدر تعمل طلب شراء.</p>
        ) : null}
        {suppliers.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {suppliers.map((s) => (
              <li key={s.id} className={`border px-3 py-1 ${s.is_active ? "" : "opacity-50"}`}>
                {s.name}
                {s.phone && <span className="text-xs text-muted-foreground" dir="ltr"> {s.phone}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* New PO */}
      <section className="border p-4">
        <h2 className="flex items-center gap-2 font-medium"><Icon name="add" size={18} className="text-muted-foreground" />طلب شراء جديد</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
          <label htmlFor="po-supplier" className="block text-sm">المورّد</label>
          <select
            id="po-supplier"
            value={poSupplier}
            onChange={(e) => setPoSupplier(e.target.value)}
            className="h-9 w-full border bg-transparent px-2 text-sm"
          >
            <option value="">اختار المورّد…</option>
            {suppliers.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="po-note" className="block text-sm">ملاحظة (اختياري)</label>
            <Input id="po-note" value={poNote} onChange={(e) => setPoNote(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="relative mt-3 space-y-1">
          <label htmlFor="po-search" className="block text-sm">زيد قطعة للطلب</label>
          <Input
            id="po-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              void searchVariants(e.target.value);
            }}
            placeholder="SKU أو اسم القطعة…"
            className="h-9"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border bg-background">
              {results.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted"
                  onClick={() => addLine(v)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Thumb src={photoFor(photos, v.product_id, v.color_en)} size="md" />
                    <span className="min-w-0 truncate">
                      {v.products.name_en} — {v.size} {v.color_en}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.variant_id} className="flex flex-wrap items-center gap-2 border px-3 py-2">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb src={photoFor(photos, l.product_id, l.color_en)} size="md" />
                  <span className="min-w-0">
                    {l.label}
                    <span className="text-xs text-muted-foreground" dir="ltr"> {l.sku}</span>
                  </span>
                </span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  الكمية
                  <Input
                    value={String(l.quantity)}
                    onChange={(e) => {
                      const n = Math.max(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 1, 1);
                      setLines((prev) => prev.map((x) => (x.variant_id === l.variant_id ? { ...x, quantity: n } : x)));
                    }}
                    className="h-8 w-16 text-left font-mono"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  كلفة $
                  <Input
                    value={l.cost}
                    onChange={(e) =>
                      setLines((prev) => prev.map((x) => (x.variant_id === l.variant_id ? { ...x, cost: e.target.value } : x)))
                    }
                    className="h-8 w-20 text-left font-mono"
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`شيل ${l.label} من الطلب`}
                  onClick={() => setLines((prev) => prev.filter((x) => x.variant_id !== l.variant_id))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={!poSupplier || !lines.length || busy} onClick={() => void createPo(true)}>
            أنشئ وأرسل الطلب
          </Button>
          <Button size="sm" variant="outline" disabled={!poSupplier || !lines.length || busy} onClick={() => void createPo(false)}>
            احفظ كمسودة
          </Button>
        </div>
      </section>

      {/* PO list */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">طلبات الشراء</h2>
        {pos.length === 0 && (
          <p className="border p-6 text-center text-sm text-muted-foreground">
            ما في طلبات شراء بعد — أول طلب بتعملو من «طلب شراء جديد» فوق بيطلع هون.
          </p>
        )}
        {pos.map((po) => {
          const receivable = ["ordered", "partial"].includes(po.status);
          return (
            <div key={po.id} className="border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-medium" dir="ltr">PO-{po.number}</span>
                  <Badge variant={po.status === "received" ? "secondary" : po.status === "cancelled" ? "outline" : "default"}>
                    {STATUS_AR[po.status] ?? po.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{po.suppliers.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {po.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const { error: err } = await supabase.rpc("po_place", { p_po_id: po.id });
                        setError(err ? `ما انبعت الطلب: ${err.message}` : "");
                        void load();
                      }}
                    >
                      أرسل الطلب
                    </Button>
                  )}
                  {["draft", "ordered"].includes(po.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (window.confirm(`تلغي طلب الشراء PO-${po.number}؟`)) {
                          const { error: err } = await supabase.rpc("po_cancel", { p_po_id: po.id });
                          setError(err ? `ما انلغى الطلب: ${err.message}` : "");
                          void load();
                        }
                      }}
                    >
                      ألغي الطلب
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(po.created_at).toLocaleDateString("ar-LB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
              {po.note && <p className="mt-1 text-xs text-muted-foreground">{po.note}</p>}

              <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-start text-muted-foreground">
                    <th className="p-2 text-start font-normal">القطعة</th>
                    <th className="p-2 text-start font-normal">مطلوب</th>
                    <th className="p-2 text-start font-normal">مستلم</th>
                    <th className="p-2 text-start font-normal">كلفة $</th>
                    {receivable && <th className="p-2 text-start font-normal">استلام هلّق</th>}
                  </tr>
                </thead>
                <tbody>
                  {po.purchase_order_items.map((it) => {
                    const remaining = it.quantity_ordered - it.quantity_received;
                    return (
                      <tr key={it.variant_id} className="border-b last:border-0">
                        <td className="p-2">
                          <span className="flex items-center gap-3">
                            <Thumb src={photoFor(photos, it.product_variants.product_id, it.product_variants.color_en)} size="sm" />
                            <span className="min-w-0">
                              {it.product_variants.products.name_en} — {it.product_variants.size} {it.product_variants.color_en}
                              <span className="block text-xs text-muted-foreground" dir="ltr">{it.product_variants.sku}</span>
                            </span>
                          </span>
                        </td>
                        <td className="p-2 font-mono">{it.quantity_ordered}</td>
                        <td className="p-2 font-mono">{it.quantity_received}</td>
                        <td className="p-2 font-mono">
                          {it.unit_cost_usd_cents != null ? (it.unit_cost_usd_cents / 100).toFixed(2) : "—"}
                        </td>
                        {receivable && (
                          <td className="p-2">
                            {remaining > 0 ? (
                              <Input
                                value={recv[`${po.id}:${it.variant_id}`] ?? ""}
                                onChange={(e) =>
                                  setRecv({ ...recv, [`${po.id}:${it.variant_id}`]: e.target.value.replace(/[^0-9]/g, "") })
                                }
                                placeholder={`≤ ${remaining}`}
                                className="h-8 w-20 text-left font-mono"
                                inputMode="numeric"
                              />
                            ) : (
                              <Badge variant="secondary">✓</Badge>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {receivable && (
                <Button size="sm" className="mt-3" disabled={busy} onClick={() => void receive(po)}>
                  سجّل الاستلام
                </Button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
