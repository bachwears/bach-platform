"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { variantPhotos } from "../lib/offline";

import { fetchLatestRate, RATE_CHANGED_MSG } from "../lib/rate";

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
  customer_id: string | null;
  customerName: string | null;
  items: OrderItem[];
  channel: string;
  fulfilment: string | null;
  delivered_at: string | null;
  delivery_usd_cents: number;
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
  walletCredit?: number;
  rate: number;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function lbp(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} ل.ل`;
}

export function Returns({
  branchId,
  branchName,
  rate: initialRate,
  tva,
  isManager = false,
}: {
  branchId: string;
  branchName: string;
  rate: number;
  tva: { enabled: boolean; rateBasisPoints: number; pricesIncludeTva: boolean };
  /** managers may go past the return/exchange window and waive the delivery fee */
  isManager?: boolean;
}) {
  const supabase = supabaseBrowser();
  // returns policy (MGMT → المرتجعات): windows in days, delivery fee kept on online deliveries
  const [policy, setPolicy] = useState({ return_days: 3, exchange_days: 7, fee_usd_cents: 500 });
  const [waiveFee, setWaiveFee] = useState(false);
  useEffect(() => {
    void supabase.rpc("returns_policy").then(({ data }) => {
      const p = (data as Array<{ return_days: number; exchange_days: number; fee_usd_cents: number }> | null)?.[0];
      if (p) setPolicy(p);
    });
  }, [supabase]);
  const [rate, setRate] = useState(initialRate);
  const [invoice, setInvoice] = useState("");
  const [order, setOrder] = useState<LoadedOrder | null>(null);
  const [retQty, setRetQty] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"return" | "exchange">("return");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // a slow connection used to look like nothing happened
  const [searching, setSearching] = useState(false);
  const [slip, setSlip] = useState<Slip | null>(null);
  // exchange state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NewLine[]>([]);
  const [newCart, setNewCart] = useState<NewLine[]>([]);
  // photos come from the till's saved catalogue (read after mount: localStorage)
  const [photoOf, setPhotoOf] = useState<ReturnType<typeof variantPhotos>>(() => () => null);
  useEffect(() => setPhotoOf(() => variantPhotos()), []);
  // settlement inputs
  const [payUsd, setPayUsd] = useState("");
  const [payLbp, setPayLbp] = useState("");
  const [toWallet, setToWallet] = useState(false);

  async function loadOrder() {
    setError("");
    setOrder(null);
    setRetQty({});
    setNewCart([]);
    setToWallet(false);
    setWaiveFee(false);
    const num = parseInt(invoice.replace(/[^0-9]/g, ""), 10);
    if (!num) {
      setError("اكتب رقم الفاتورة (أرقام بس).");
      return;
    }
    setSearching(true);
    const { data: o } = await supabase
      .from("orders")
      .select("id, number, status, subtotal_usd_cents, total_usd_cents, delivery_usd_cents, channel, fulfilment, delivered_at, created_at, customer_id, customers(full_name), order_items(*)")
      .eq("number", num)
      .maybeSingle();
    setSearching(false);
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
      channel: o.channel,
      fulfilment: o.fulfilment,
      delivered_at: o.delivered_at,
      delivery_usd_cents: o.delivery_usd_cents ?? 0,
      customer_id: (o as { customer_id?: string | null }).customer_id ?? null,
      customerName: (() => {
        const c = (o as unknown as { customers?: { full_name: string | null } | Array<{ full_name: string | null }> }).customers;
        return (Array.isArray(c) ? c[0]?.full_name : c?.full_name) ?? null;
      })(),
      items: (o.order_items as unknown as Omit<OrderItem, "returned">[]).map((i) => ({
        ...i,
        returned: returnedBy[i.id] ?? 0,
      })),
    });
  }

  // Credit mirrors the server formula: line share × ((total − delivery) / subtotal).
  const factor = order
    ? (order.total_usd_cents - order.delivery_usd_cents) / Math.max(order.subtotal_usd_cents, 1)
    : 1;
  const itemsCredit = order
    ? order.items.reduce((s, i) => {
        const q = retQty[i.id] ?? 0;
        return s + Math.round(((i.line_total_usd_cents * q) / i.quantity) * factor);
      }, 0)
    : 0;
  // Policy: online deliveries keep the delivery fee; windows count from when
  // the customer received the order (online: delivered; in store: the sale).
  const feeApplies = !!order && order.channel === "online" && (order.fulfilment ?? "delivery") === "delivery";
  const fee = feeApplies && !waiveFee && itemsCredit > 0 ? Math.min(policy.fee_usd_cents, itemsCredit) : 0;
  const credit = itemsCredit - fee;
  const receivedAt = order ? (order.channel === "online" ? order.delivered_at : order.created_at) : null;
  const until = (days: number) => (receivedAt ? new Date(new Date(receivedAt).getTime() + days * 86_400_000) : null);
  const returnUntil = until(policy.return_days);
  const exchangeUntil = until(policy.exchange_days);
  const deadline = mode === "return" ? returnUntil : exchangeUntil;
  const windowPassed = !!deadline && Date.now() > deadline.getTime();
  const dateAr = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

  // Same total pos_exchange charges: TVA is added on top when prices exclude it.
  const newItemsCents = newCart.reduce((s, l) => s + l.unitUsdCents * l.quantity, 0);
  const newTotal =
    tva.enabled && !tva.pricesIncludeTva
      ? newItemsCents + Math.round((newItemsCents * tva.rateBasisPoints) / 10_000)
      : newItemsCents;
  const net = mode === "exchange" ? newTotal - credit : -credit;
  const payUsdCents = Math.round((parseFloat(payUsd) || 0) * 100);
  const payLbpAmt = Math.round(parseFloat(payLbp.replace(/,/g, "")) || 0);
  const paidEquiv = payUsdCents + Math.round((payLbpAmt / rate) * 100);
  const settled =
    net > 5 ? paidEquiv >= net - 5 : net < -5 ? (toWallet ? payUsdCents === 0 && payLbpAmt === 0 : Math.abs(paidEquiv + net) <= 5) : payUsdCents === 0 && payLbpAmt === 0;
  const anyReturn = credit > 0;
  const canSubmit =
    !busy && anyReturn && settled && (mode === "return" || newCart.length > 0) && (!windowPassed || isManager);

  async function search(text: string) {
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const q = text.trim().replace(/[,()%*\\]/g, " ").trim();
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

    // The rate may have changed in MGMT since this page loaded — settle at the current one.
    const latestRate = await fetchLatestRate(supabase);
    if (latestRate != null && latestRate !== rate) {
      setRate(latestRate);
      setBusy(false);
      setError(RATE_CHANGED_MSG);
      return;
    }

    if (mode === "return") {
      const useWallet = toWallet && !!order.customer_id;
      // Wallet refunds: the database credits the wallet in the same step as the return.
      const { error: err } = await supabase.rpc("pos_return", {
        p_order_id: order.id,
        p_items: retItems,
        p_refunds: useWallet ? [] : cash,
        ...(useWallet ? { p_to_wallet: true } : {}),
        ...(waiveFee ? { p_waive_fee: true } : {}),
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
        refundUsd: useWallet ? 0 : payUsdCents,
        refundLbp: useWallet ? 0 : payLbpAmt,
        walletCredit: useWallet ? credit : 0,
        rate,
      });
    } else {
      const useWallet = toWallet && !!order.customer_id && net < -5;
      const { data, error: err } = await supabase.rpc("pos_exchange", {
        p_order_id: order.id,
        p_return_items: retItems,
        p_new_items: newCart.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        p_payments: net > 5 ? cash : [],
        p_refunds: net < -5 && !useWallet ? cash : [],
        ...(useWallet ? { p_to_wallet: true } : {}),
        ...(waiveFee ? { p_waive_fee: true } : {}),
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
        refundUsd: net < -5 && !useWallet ? payUsdCents : 0,
        refundLbp: net < -5 && !useWallet ? payLbpAmt : 0,
        walletCredit: useWallet ? Math.abs(net) : 0,
        rate,
      });
    }
    setOrder(null);
    setInvoice("");
    setRetQty({});
    setNewCart([]);
    setPayUsd("");
    setPayLbp("");
    setToWallet(false);
  }

  if (slip) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 print:p-0">
        <div className="rounded-lg border p-6 print:border-0" dir="ltr">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bach.png" alt="BACH" className="mx-auto h-5 w-auto dark:invert print:invert-0" />
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
            {(slip.walletCredit ?? 0) > 0 && <Row label="Wallet credit" value={usd(slip.walletCredit!)} />}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Exchange rate: LBP {slip.rate.toLocaleString("en-US")} / $
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Thank you for shopping with us.</p>
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
        <Button className="h-11" disabled={searching} onClick={() => void loadOrder()}>
          {searching ? "عم نفتّش…" : "فتّش"}
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
                        <div className="flex items-center gap-3">
                          <Thumb src={photoOf(i.variant_id)} />
                          <div>
                            {i.name_en}
                            <span className="block text-xs text-muted-foreground">
                              {i.size} {i.color_en} <span dir="ltr">{i.sku}</span>
                            </span>
                          </div>
                        </div>
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

          {/* A choice, not an action — labelled so nobody mistakes it for the save button. */}
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="نوع العملية">
            <span className="text-sm text-muted-foreground">نوع العملية:</span>
            <Button
              role="radio"
              aria-checked={mode === "return"}
              variant={mode === "return" ? "default" : "outline"}
              onClick={() => setMode("return")}
            >
              {mode === "return" ? "✓ " : ""}إرجاع واسترداد
            </Button>
            <Button
              role="radio"
              aria-checked={mode === "exchange"}
              variant={mode === "exchange" ? "default" : "outline"} onClick={() => setMode("exchange")}>
              {mode === "exchange" ? "✓ " : ""}تبديل بقطع تانية
            </Button>
          </div>

          <div className={`space-y-1 rounded-lg border p-3 text-sm ${windowPassed ? "border-destructive/60" : ""}`}>
            <p>
              {order.channel === "online" ? "وصل للزبون" : "اشترى بالمحل"}: <span dir="ltr">{dateAr(receivedAt ? new Date(receivedAt) : null)}</span>
              {" · "}الإرجاع لغاية <span dir="ltr">{dateAr(returnUntil)}</span>
              {" · "}التبديل لغاية <span dir="ltr">{dateAr(exchangeUntil)}</span>
            </p>
            {windowPassed && (
              <p className="text-destructive">
                {mode === "return" ? "انتهت مدة الإرجاع" : "انتهت مدة التبديل"}
                {isManager ? " — إنت مدير، فيك تكمّل كاستثناء." : " — بدّها موافقة مدير (بدّل عالمدير وكمّل)."}
              </p>
            )}
            {feeApplies && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  رسوم توصيل المرتجع/التبديل: {waiveFee ? "معفى" : usd(policy.fee_usd_cents)} — بتنطرح من المبلغ يلي بيرجع للزبون.
                </span>
                {isManager && (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={waiveFee} onChange={(e) => setWaiveFee(e.target.checked)} className="h-4 w-4 accent-foreground" />
                    إعفاء (رجّعها عالمحل)
                  </label>
                )}
              </div>
            )}
          </div>

          {order.customer_id ? (
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input type="checkbox" className="h-5 w-5 shrink-0 cursor-pointer accent-foreground" checked={toWallet} onChange={(e) => setToWallet(e.target.checked)} />
              <span>
                رجّع المبلغ <span className="font-medium">رصيد على محفظة الزبون</span>
                {order.customerName ? <span className="text-muted-foreground"> ({order.customerName})</span> : null} بدل الكاش
                <span className="block text-xs text-muted-foreground">بيستعمله أونلاين — وإذا عبّى محفظته بـWhish بياخد 10% خصم عالطلبات المدفوعة منها.</span>
              </span>
            </label>
          ) : null}

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
                        <span className="flex items-center gap-3">
                          <Thumb src={photoOf(r.variantId)} size="sm" />
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
                  <span className="flex items-center gap-3">
                    <Thumb src={photoOf(l.variantId)} size="sm" />
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
            {fee > 0 ? (
              <>
                <Row label="قيمة القطع المرجوعة" value={usd(itemsCredit)} />
                <Row label="رسوم التوصيل" value={`− ${usd(fee)}`} />
              </>
            ) : null}
            <Row label="قيمة المرجوع" value={usd(credit)} />
            {mode === "exchange" && (
              <Row label={tva.enabled && !tva.pricesIncludeTva ? "قيمة القطع الجديدة (مع TVA)" : "قيمة القطع الجديدة"} value={usd(newTotal)} />
            )}
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
            {/* Say why the button is off instead of leaving the cashier guessing. */}
            {!busy && !canSubmit ? (
              <p className="text-center text-xs text-muted-foreground">
                {!anyReturn
                  ? "اختار القطع يلّي عم ترجع (+) ليتفعّل الزر."
                  : mode === "exchange" && newCart.length === 0
                    ? "زيد القطع الجديدة يلّي بدّو ياخدها الزبون."
                    : net < -5
                      ? `اكتب المبلغ يلّي رجّعته للزبون (${usd(-net)} أو ${lbp((-net / 100) * rate)})${order?.customer_id ? "، أو علّم خانة المحفظة فوق" : ""}.`
                      : net > 5
                        ? `اكتب المبلغ يلّي دفعه الزبون (${usd(net)} أو ${lbp((net / 100) * rate)}).`
                        : "المبلغين لازم يكونوا صفر — ما في فرق بالحساب."}
              </p>
            ) : null}
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
