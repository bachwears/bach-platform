"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

interface VariantHit {
  id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color_ar: string;
  price_usd_cents_override: number | null;
  products: { name_ar: string; name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
  inventory_levels: Array<{ branch_id: string; quantity: number; reserved: number }>;
}

interface CartLine {
  variantId: string;
  sku: string | null;
  nameAr: string;
  size: string;
  colorAr: string;
  unitUsdCents: number;
  quantity: number;
  available: number;
}

interface Receipt {
  number: number;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  tva: number;
  total: number;
  paidUsdCents: number;
  paidLbp: number;
  changeLbp: number;
  rate: number;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function lbp(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} ل.ل`;
}

function unitPrice(v: VariantHit): number {
  const p = v.products;
  return v.price_usd_cents_override ?? Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);
}

export function Cashier({
  branchId,
  branchName,
  rate,
  tva,
}: {
  branchId: string;
  branchName: string;
  rate: number;
  tva: { enabled: boolean; rateBasisPoints: number; pricesIncludeTva: boolean };
}) {
  const supabase = supabaseBrowser();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantHit[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState("");
  const [paidUsd, setPaidUsd] = useState("");
  const [paidLbpStr, setPaidLbpStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => searchRef.current?.focus(), [receipt]);

  const addVariant = useCallback(
    (v: VariantHit) => {
      const level = v.inventory_levels.find((l) => l.branch_id === branchId);
      const available = level ? level.quantity - level.reserved : 0;
      setCart((prev) => {
        const existing = prev.find((l) => l.variantId === v.id);
        if (existing) {
          if (existing.quantity >= available) return prev;
          return prev.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l));
        }
        if (available <= 0) {
          setError(`ما في مخزون كافي: ${v.sku ?? v.products.name_ar}`);
          return prev;
        }
        return [
          ...prev,
          {
            variantId: v.id,
            sku: v.sku,
            nameAr: v.products.name_ar,
            size: v.size,
            colorAr: v.color_ar,
            unitUsdCents: unitPrice(v),
            quantity: 1,
            available,
          },
        ];
      });
      setQuery("");
      setResults([]);
      searchRef.current?.focus();
    },
    [branchId],
  );

  async function runSearch(text: string, exact: boolean) {
    const q = text.trim();
    if (!q) return;
    setError("");
    const select =
      "id, sku, barcode, size, color_ar, price_usd_cents_override, products!inner(name_ar, name_en, price_usd_cents, sale_price_usd_cents), inventory_levels(branch_id, quantity, reserved)";
    if (exact) {
      const { data } = await supabase
        .from("product_variants")
        .select(select)
        .or(`barcode.eq.${q},sku.eq.${q}`)
        .eq("is_active", true)
        .limit(1);
      if (data?.length) {
        addVariant(data[0] as unknown as VariantHit);
        return;
      }
    }
    const { data: skuHits } = await supabase
      .from("product_variants")
      .select(select)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(8);
    const hits = [...((skuHits ?? []) as unknown as VariantHit[])];
    if (hits.length < 8) {
      const { data: prods } = await supabase
        .from("products")
        .select("id")
        .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`)
        .limit(5);
      if (prods?.length) {
        const { data: nameHits } = await supabase
          .from("product_variants")
          .select(select)
          .eq("is_active", true)
          .in(
            "product_id",
            prods.map((p) => p.id),
          )
          .limit(8);
        for (const h of (nameHits ?? []) as unknown as VariantHit[]) {
          if (!hits.some((x) => x.id === h.id)) hits.push(h);
        }
      }
    }
    setResults(hits.slice(0, 8));
    if (exact && !hits.length) setError("ما لقينا شي بهالرقم أو الاسم.");
  }

  const setQty = (variantId: string, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(qty, l.available) } : l)),
    );

  const subtotal = cart.reduce((s, l) => s + l.unitUsdCents * l.quantity, 0);
  const discountBp = Math.round(Math.min(Math.max(parseFloat(discountPct) || 0, 0), 100) * 100);
  const discount = Math.round((subtotal * discountBp) / 10_000);
  let total = subtotal - discount;
  let tvaCents = 0;
  if (tva.enabled) {
    if (tva.pricesIncludeTva) {
      tvaCents = total - Math.round((total * 10_000) / (10_000 + tva.rateBasisPoints));
    } else {
      tvaCents = Math.round((total * tva.rateBasisPoints) / 10_000);
      total += tvaCents;
    }
  }

  const paidUsdCents = Math.round((parseFloat(paidUsd) || 0) * 100);
  const paidLbp = Math.round(parseFloat(paidLbpStr.replace(/,/g, "")) || 0);
  const paidEquivCents = paidUsdCents + Math.round((paidLbp / rate) * 100);
  const remainingCents = total - paidEquivCents;
  const changeLbp = remainingCents < 0 ? Math.round((-remainingCents / 100) * rate) : 0;
  const canCheckout = cart.length > 0 && paidEquivCents >= total - 5 && !busy;

  async function checkout() {
    if (!canCheckout) return;
    setBusy(true);
    setError("");
    const payments: Array<{ currency: string; amount_minor: number }> = [];
    if (paidUsdCents > 0) payments.push({ currency: "USD", amount_minor: paidUsdCents });
    if (paidLbp > 0) payments.push({ currency: "LBP", amount_minor: paidLbp });
    const { data, error: err } = await supabase.rpc("pos_checkout", {
      p_branch_id: branchId,
      p_items: cart.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      p_payments: payments,
      p_discount_basis_points: discountBp,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("insufficient stock")
          ? "المخزون ما بيكفي — حدّث الكمية."
          : `ما مشي الحال: ${err.message}`,
      );
      return;
    }
    setReceipt({
      number: data![0].order_number,
      lines: cart,
      subtotal,
      discount,
      tva: tvaCents,
      total,
      paidUsdCents,
      paidLbp,
      changeLbp,
      rate,
    });
    setCart([]);
    setDiscountPct("");
    setPaidUsd("");
    setPaidLbpStr("");
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 print:p-0">
        <div className="rounded-lg border p-6 print:border-0" dir="rtl">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-widest">BACH WEARS</h2>
            <p className="text-sm text-muted-foreground">{branchName}</p>
            <p className="mt-2 font-mono text-lg">فاتورة #{receipt.number}</p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString("en-GB")}</p>
          </div>
          <div className="my-4 border-t border-dashed" />
          {receipt.lines.map((l) => (
            <div key={l.variantId} className="flex justify-between py-1 text-sm">
              <span>
                {l.nameAr} — {l.size} {l.colorAr} × {l.quantity}
              </span>
              <span className="font-mono">{usd(l.unitUsdCents * l.quantity)}</span>
            </div>
          ))}
          <div className="my-4 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            <Row label="المجموع" value={usd(receipt.subtotal)} />
            {receipt.discount > 0 && <Row label="خصم" value={`- ${usd(receipt.discount)}`} />}
            {receipt.tva > 0 && <Row label="TVA" value={usd(receipt.tva)} />}
            <div className="flex justify-between text-base font-bold">
              <span>الإجمالي</span>
              <span className="font-mono">
                {usd(receipt.total)} / {lbp((receipt.total / 100) * receipt.rate)}
              </span>
            </div>
            {receipt.paidUsdCents > 0 && <Row label="دفع دولار" value={usd(receipt.paidUsdCents)} />}
            {receipt.paidLbp > 0 && <Row label="دفع ليرة" value={lbp(receipt.paidLbp)} />}
            {receipt.changeLbp > 0 && <Row label="الباقي (ليرة)" value={lbp(receipt.changeLbp)} />}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              سعر الصرف: {receipt.rate.toLocaleString("en-US")} ل.ل / $
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">شكراً لزيارتكم 🖤</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <Button className="flex-1" onClick={() => window.print()}>
            طباعة
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => setReceipt(null)}>
            بيع جديد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Search + cart */}
      <section className="space-y-4">
        <div className="relative">
          <Input
            ref={searchRef}
            value={query}
            placeholder="امسح الباركود أو فتّش بالاسم / SKU…"
            className="h-12 text-lg"
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 2) void runSearch(e.target.value, false);
              else setResults([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch(query, true);
              }
            }}
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {results.map((v) => {
                const level = v.inventory_levels.find((l) => l.branch_id === branchId);
                const avail = level ? level.quantity - level.reserved : 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2 text-right hover:bg-muted disabled:opacity-40"
                    disabled={avail <= 0}
                    onClick={() => addVariant(v)}
                  >
                    <span>
                      {v.products.name_ar} — {v.size} {v.color_ar}
                      <span className="block text-xs text-muted-foreground" dir="ltr">
                        {v.sku}
                      </span>
                    </span>
                    <span className="text-sm">
                      <span className="font-mono">{usd(unitPrice(v))}</span>
                      <span className={`block text-xs ${avail > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                        {avail > 0 ? `متوفر: ${avail}` : "خالص"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

        <div className="rounded-lg border">
          {cart.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">السلة فاضية — امسح أول قطعة.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">القطعة</th>
                  <th className="p-3 font-normal">الكمية</th>
                  <th className="p-3 font-normal">السعر</th>
                  <th className="p-3 font-normal">المجموع</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.variantId} className="border-b last:border-0">
                    <td className="p-3">
                      {l.nameAr}
                      <span className="block text-xs text-muted-foreground">
                        {l.size} {l.colorAr} <span dir="ltr">{l.sku}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2" dir="ltr">
                        <Button size="sm" variant="outline" onClick={() => setQty(l.variantId, l.quantity - 1)}>
                          −
                        </Button>
                        <span className="w-6 text-center font-mono">{l.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={l.quantity >= l.available}
                          onClick={() => setQty(l.variantId, l.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 font-mono">{usd(l.unitUsdCents)}</td>
                    <td className="p-3 font-mono">{usd(l.unitUsdCents * l.quantity)}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => setQty(l.variantId, 0)}>
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Totals + payment */}
      <aside className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-4 lg:self-start">
        <div className="space-y-2 text-sm">
          <Row label="المجموع" value={usd(subtotal)} />
          <div className="flex items-center justify-between gap-2">
            <label className="text-muted-foreground" htmlFor="disc">
              خصم %
            </label>
            <Input
              id="disc"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="h-8 w-20 text-left font-mono"
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          {discount > 0 && <Row label="قيمة الخصم" value={`- ${usd(discount)}`} />}
          {tva.enabled && <Row label={tva.pricesIncludeTva ? "منها TVA" : "TVA"} value={usd(tvaCents)} />}
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>الإجمالي</span>
            <span className="font-mono">{usd(total)}</span>
          </div>
          <p className="text-left font-mono text-sm text-muted-foreground">{lbp((total / 100) * rate)}</p>
          <p className="text-xs text-muted-foreground">سعر الصرف: {rate.toLocaleString("en-US")} ل.ل / $</p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1">
            <label className="text-sm" htmlFor="paid-usd">
              المدفوع دولار ($)
            </label>
            <Input
              id="paid-usd"
              value={paidUsd}
              onChange={(e) => setPaidUsd(e.target.value)}
              className="text-left font-mono"
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="paid-lbp">
              المدفوع ليرة (ل.ل)
            </label>
            <Input
              id="paid-lbp"
              value={paidLbpStr}
              onChange={(e) => setPaidLbpStr(e.target.value)}
              className="text-left font-mono"
              inputMode="numeric"
              placeholder="0"
            />
          </div>
          {cart.length > 0 && remainingCents > 5 && (
            <p className="text-sm text-destructive">
              ناقص {usd(remainingCents)} ({lbp((remainingCents / 100) * rate)})
            </p>
          )}
          {changeLbp > 0 && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">الباقي للزبون: {lbp(changeLbp)}</p>
          )}
          <Button className="h-12 w-full text-lg" disabled={!canCheckout} onClick={() => void checkout()}>
            {busy ? "عم نسجّل…" : "تسجيل البيع"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
