"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

interface OrderItem {
  id: string;
  variant_id: string;
  sku: string | null;
  name_en: string;
  size: string;
  color_en: string;
  quantity: number;
  unit_price_usd_cents: number;
  line_total_usd_cents: number;
  returned: number;
}

interface LoadedOrder {
  id: string;
  number: number;
  status: string;
  subtotal_usd_cents: number;
  total_usd_cents: number;
  created_at: string;
  items: OrderItem[];
}

interface NewLine {
  variantId: string;
  sku: string | null;
  nameEn: string;
  size: string;
  colorEn: string;
  unitUsdCents: number;
  quantity: number;
  available: number;
}

interface Slip {
  kind: "return" | "exchange";
  orderNumber: number;
  newOrderNumber?: number;
  credit: number;
  newTotal?: number;
  cashInUsd: number;
  cashInLbp: number;
  refundUsd: number;
  refundLbp: number;
  rate: number;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function lbp(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} ل.ل`;
}

export function Returns({ branchId, branchName, rate }: { branchId: string; branchName: string; rate: number }) {
  const supabase = supabaseBrowser();
  const [invoice, setInvoice] = useState("");
  const [order, setOrder] = useState<LoadedOrder | null>(null);
  const [retQty, setRetQty] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"return" | "exchange">("return");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<Slip | null>(null);
  // exchange state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NewLine[]>([]);
  const [newCart, setNewCart] = useState<NewLine[]>([]);
  // settlement inputs
  const [payUsd, setPayUsd] = useState("");
  const [payLbp, setPayLbp] = useState("");

  async function loadOrder() {
    setError("");
    setOrder(null);
    setRetQty({});
    setNewCart([]);
    const num = parseInt(invoice.replace(/[^0-9]/g, ""), 10);
    if (!num) return;
    const { data: o } = await supabase
      .from("orders")
      .select("id, number, status, subtotal_usd_cents, total_usd_cents, created_at, order_items(*)")
      .eq("number", num)
      .maybeSingle();
    if (!o) {
      setError("ما لقينا فاتورة بهالرقم.");
      return;
    }
    if (!["completed", "delivered"].includes(o.status)) {
      setError(`هالطلب حالته "${o.status}" — ما فيه يترجّع.`);
      return;
    }
    const itemIds = (o.order_items ?? []).map((i: { id: string }) => i.id);
    const { data: prev } = await supabase
      .from("order_return_items")
      .select("order_item_id, quantity")
      .in("order_item_id", itemIds);
    const returnedBy: Record<string, number> = {};
    for (const r of prev ?? []) returnedBy[r.order_item_id] = (returnedBy[r.order_item_id] ?? 0) + r.quantity;
    setOrder({
      id: o.id,
      number: o.number,
      status: o.status,
      subtotal_usd_cents: o.subtotal_usd_cents,
      total_usd_cents: o.total_usd_cents,
      created_at: o.created_at,
      items: (o.order_items as unknown as Omit<OrderItem, "returned">[]).map((i) => ({
        ...i,
        returned: returnedBy[i.id] ?? 0,
      })),
    });
  }

  // Credit mirrors the server formula: line share × (total / subtotal).
  const factor = order ? order.total_usd_cents / Math.max(order.subtotal_usd_cents, 1) : 1;
  const credit = order
    ? order.items.reduce((s, i) => {
        const q = retQty[i.id] ?? 0;
        return s + Math.round(((i.line_total_usd_cents * q) / i.quantity) * factor);
      }, 0)
    : 0;

  const newTotal = newCart.reduce((s, l) => s + l.unitUsdCents * l.quantity, 0);
  const net = mode === "exchange" ? newTotal - credit : -credit;
  const payUsdCents = Math.round((parseFloat(payUsd) || 0) * 100);
  const payLbpAmt = Math.round(parseFloat(payLbp.replace(/,/g, "")) || 0);
  const paidEquiv = payUsdCents + Math.round((payLbpAmt / rate) * 100);
  const settled =
    net > 5 ? paidEquiv >= net - 5 : net < -5 ? Math.abs(paidEquiv + net) <= 5 : payUsdCents === 0 && payLbpAmt === 0;
  const anyReturn = credit > 0;
  const canSubmit = !busy && anyReturn && settled && (mode === "return" || newCart.length > 0);

  async function search(text: string) {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const select =
      "id, sku, size, color_en, price_usd_cents_override, products!inner(name_en, price_usd_cents, sale_price_usd_cents), inventory_levels(branch_id, quantity, reserved)";
    const { data } = await supabase
      .from("product_variants")
      .select(select)
      .eq("is_active", true)
      .or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(6);
    setResults(
      ((data ?? []) as unknown as Array<Record<string, unknown>>).map((v) => {
        const p = v.products as { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
        const lvl = (v.inventory_levels as Array<{ branch_id: string; quantity: number; reserved: number }>).find(
          (l) => l.branch_id === branchId,
        );
        return {
          variantId: v.id as string,
          sku: v.sku as string | null,
          nameEn: p.name_en,
          size: v.size as string,
          colorEn: v.color_en as string,
          unitUsdCents:
            (v.price_usd_cents_override as number | null) ??
            Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents),
          quantity: 1,
          available: lvl ? lvl.quantity - lvl.reserved : 0,
        };
      }),
    );
  }

  async function submit() {
    if (!order || !canSubmit) return;
    setBusy(true);
    setError("");
    const retItems = order.items
      .filter((i) => (retQty[i.id] ?? 0) > 0)
      .map((i) => ({ order_item_id: i.id, quantity: retQty[i.id] }));
    const cash: Array<{ currency: string; amount_minor: number }> = [];
    if (payUsdCents > 0) cash.push({ currency: "USD", amount_minor: payUsdCents });
    if (payLbpAmt > 0) cash.push({ currency: "LBP", amount_minor: payLbpAmt });

    if (mode === "return") {
      const { error: err } = await supabase.rpc("pos_return", {
        p_order_id: order.id,
        p_items: retItems,
        p_refunds: cash,
      });
      setBusy(false);
      if (err) {
        setError(`ما مشي الحال: ${err.message}`);
        return;
      }
      setSlip({
        kind: "return",
        orderNumber: order.number,
        credit,
        cashInUsd: 0,
        cashInLbp: 0,
        refundUsd: payUsdCents,
        refundLbp: payLbpAmt,
        rate,
      });
    } else {
      const { data, error: err } = await supabase.rpc("pos_exchange", {
        p_order_id: order.id,
        p_return_items: retItems,
        p_new_items: newCart.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        p_payments: net > 5 ? cash : [],
        p_refunds: net < -5 ? cash : [],
      });
      setBusy(false);
      if (err) {
        setError(`ما مشي الحال: ${err.message}`);
        return;
      }
      setSlip({
        kind: "exchange",
        orderNumber: order.number,
        newOrderNumber: data?.[0]?.new_order_number,
        credit,
        newTotal,
        cashInUsd: net > 5 ? payUsdCents : 0,
        cashInLbp: net > 5 ? payLbpAmt : 0,
        refundUsd: net < -5 ? payUsdCents : 0,
        refundLbp: net < -5 ? payLbpAmt : 0,
        rate,
      });
    }
    setOrder(null);
    setInvoice("");
    setRetQty({});
    setNewCart([]);
    setPayUsd("");
    setPayLbp("");
  }

  if (slip) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 print:p-0">
        <div className="rounded-lg border p-6 print:border-0" dir="ltr">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-widest">BACH WEARS</h2>
            <p className="text-sm text-muted-foreground">{branchName}</p>
            <p className="mt-2 font-mono text-lg">
              {slip.kind === "return" ? "Return" : "Exchange"} — Invoice #{slip.orderNumber}
              {slip.newOrderNumber ? ` → #${slip.newOrderNumber}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString("en-GB")}</p>
          </div>
          <div className="my-4 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            <Row label="Return credit" value={usd(slip.credit)} />
            {slip.newTotal != null && <Row label="New items" value={usd(slip.newTotal)} />}
            {slip.cashInUsd > 0 && <Row label="Paid USD" value={usd(slip.cashInUsd)} />}
            {slip.cashInLbp > 0 && <Row label="Paid LBP" value={`LBP ${slip.cashInLbp.toLocaleString("en-US")}`} />}
            {slip.refundUsd > 0 && <Row label="Refund USD" value={usd(slip.refundUsd)} />}
            {slip.refundLbp > 0 && <Row label="Refund LBP" value={`LBP ${slip.refundLbp.toLocaleString("en-US")}`} />}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Exchange rate: LBP {slip.rate.toLocaleString("en-US")} / $
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Thank you 🖤</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <Button className="flex-1" onClick={() => window.print()}>
            طباعة
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => setSlip(null)}>
            عملية جديدة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Input
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void loadOrder();
            }
          }}
          placeholder="رقم الفاتورة…"
          className="h-11 text-lg"
          inputMode="numeric"
        />
        <Button className="h-11" onClick={() => void loadOrder()}>
          فتّش
        </Button>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      {order && (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              فاتورة <span className="font-mono">#{order.number}</span> —{" "}
              {new Date(order.created_at).toLocaleDateString("en-GB")}
            </span>
            <span className="font-mono">{usd(order.total_usd_cents)}</span>
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">القطعة</th>
                  <th className="p-3 font-normal">مباع</th>
                  <th className="p-3 font-normal">مرجوع سابقاً</th>
                  <th className="p-3 font-normal">رجّع</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => {
                  const max = i.quantity - i.returned;
                  const q = retQty[i.id] ?? 0;
                  return (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="p-3">
                        {i.name_en}
                        <span className="block text-xs text-muted-foreground">
                          {i.size} {i.color_en} <span dir="ltr">{i.sku}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono">{i.quantity}</td>
                      <td className="p-3 font-mono">{i.returned}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2" dir="ltr">
                          <Button size="sm" variant="outline" disabled={q <= 0} onClick={() => setRetQty({ ...retQty, [i.id]: q - 1 })}>
                            −
                          </Button>
                          <span className="w-6 text-center font-mono">{q}</span>
                          <Button size="sm" variant="outline" disabled={q >= max} onClick={() => setRetQty({ ...retQty, [i.id]: q + 1 })}>
                            +
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant={mode === "return" ? "default" : "outline"} onClick={() => setMode("return")}>
              مرتجع (كاش)
            </Button>
            <Button variant={mode === "exchange" ? "default" : "outline"} onClick={() => setMode("exchange")}>
              تبديل بقطع تانية
            </Button>
          </div>

          {mode === "exchange" && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">القطع الجديدة</p>
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    void search(e.target.value);
                  }}
                  placeholder="امسح الباركود أو SKU…"
                />
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
                    {results.map((r) => (
                      <button
                        key={r.variantId}
                        type="button"
                        disabled={r.available <= 0}
                        className="flex w-full items-center justify-between px-4 py-2 text-right hover:bg-muted disabled:opacity-40"
                        onClick={() => {
                          setNewCart((prev) => {
                            const ex = prev.find((l) => l.variantId === r.variantId);
                            if (ex)
                              return prev.map((l) =>
                                l.variantId === r.variantId && l.quantity < l.available
                                  ? { ...l, quantity: l.quantity + 1 }
                                  : l,
                              );
                            return [...prev, r];
                          });
                          setQuery("");
                          setResults([]);
                        }}
                      >
                        <span>
                          {r.nameEn} — {r.size} {r.colorEn}
                        </span>
                        <span className="font-mono text-sm">{usd(r.unitUsdCents)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {newCart.map((l) => (
                <div key={l.variantId} className="flex items-center justify-between text-sm">
                  <span>
                    {l.nameEn} — {l.size} {l.colorEn} × {l.quantity}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{usd(l.unitUsdCents * l.quantity)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewCart(newCart.filter((x) => x.variantId !== l.variantId))}
                    >
                      ✕
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <Row label="قيمة المرجوع" value={usd(credit)} />
            {mode === "exchange" && <Row label="قيمة القطع الجديدة" value={usd(newTotal)} />}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>{net > 5 ? "الزبون بيدفع" : net < -5 ? "منرجّع للزبون" : "متعادل"}</span>
              <span className="font-mono">
                {usd(Math.abs(net))} / {lbp((Math.abs(net) / 100) * rate)}
              </span>
            </div>
            {(net > 5 || net < -5) && (
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="ret-usd">
                    {net > 5 ? "المدفوع" : "المرجّع"} دولار ($)
                  </label>
                  <Input id="ret-usd" value={payUsd} onChange={(e) => setPayUsd(e.target.value)} className="text-left font-mono" inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="ret-lbp">
                    {net > 5 ? "المدفوع" : "المرجّع"} ليرة (ل.ل)
                  </label>
                  <Input id="ret-lbp" value={payLbp} onChange={(e) => setPayLbp(e.target.value)} className="text-left font-mono" inputMode="numeric" placeholder="0" />
                </div>
              </div>
            )}
            <Button className="mt-2 h-11 w-full" disabled={!canSubmit} onClick={() => void submit()}>
              {busy ? "عم نسجّل…" : mode === "return" ? "تسجيل المرتجع" : "تسجيل التبديل"}
            </Button>
          </div>
        </>
      )}
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
