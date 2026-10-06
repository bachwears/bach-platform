"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { EmptyState } from "@bach/ui/components/empty-state";
import { Icon, type IconName } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { OrderStatus } from "@bach/ui/components/order-status";
import { Thumb } from "@bach/ui/components/thumb";
import { variantPhotos } from "../lib/offline";

import { CustomerPoints } from "./customer-points";
import { type ReceiptData, ReceiptView } from "./receipt";

interface Inv {
  id: string;
  number: number;
  status: string;
  channel: string;
  total_usd_cents: number;
  discount_usd_cents: number;
  subtotal_usd_cents: number;
  tva_usd_cents: number;
  delivery_usd_cents: number;
  lbp_per_usd: number | string;
  payment_method: string | null;
  fulfilment: string | null;
  ship_name: string | null;
  ship_phone: string | null;
  ship_city: string | null;
  ship_address: string | null;
  note: string | null;
  created_at: string;
  branches: { name: string } | null;
  customers: { id: string; full_name: string | null; phone: string | null; balance_usd_cents: number } | null;
  order_items: Array<{
    variant_id: string | null;
    name_en: string;
    size: string;
    color_en: string;
    sku: string | null;
    quantity: number;
    unit_price_usd_cents: number;
    line_total_usd_cents: number;
  }>;
  order_payments: Array<{ method: string; currency: string; amount_minor: number }>;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const SELECT =
  "id, number, status, channel, total_usd_cents, discount_usd_cents, subtotal_usd_cents, tva_usd_cents, delivery_usd_cents, lbp_per_usd, payment_method, fulfilment, ship_name, ship_phone, ship_city, ship_address, note, created_at, branches(name), customers(id, full_name, phone, balance_usd_cents), order_items(variant_id, name_en, size, color_en, sku, quantity, unit_price_usd_cents, line_total_usd_cents), order_payments(method, currency, amount_minor)";

/** The payment method's icon (cash on delivery is cash; store credit is the wallet). */
const METHOD_ICON: Record<string, IconName> = { cash: "cash", cod: "cash", whish: "whish", stripe: "card", credit: "wallet" };
const METHOD_EN: Record<string, string> = { credit: "Store credit", whish: "Whish", cod: "Cash on delivery", stripe: "Card" };

/** Rebuild the till receipt from what the sale recorded (a reprint). */
function receiptOf(o: Inv): ReceiptData {
  const pays = o.order_payments ?? [];
  const cash = pays.filter((p) => p.method === "cash");
  const sum = (xs: typeof pays) => xs.reduce((s, p) => s + Number(p.amount_minor), 0);
  const others = new Map<string, number>();
  for (const p of pays.filter((x) => x.method !== "cash" && x.currency === "USD")) {
    others.set(p.method, (others.get(p.method) ?? 0) + Number(p.amount_minor));
  }
  return {
    number: o.number,
    lines: o.order_items.map((i, k) => ({
      key: `${k}-${i.sku ?? i.name_en}`,
      nameEn: i.name_en,
      size: i.size,
      colorEn: i.color_en,
      quantity: i.quantity,
      unitUsdCents: i.unit_price_usd_cents,
    })),
    subtotal: o.subtotal_usd_cents,
    discount: o.discount_usd_cents,
    tva: o.tva_usd_cents,
    total: o.total_usd_cents,
    paidUsdCents: sum(cash.filter((p) => p.currency === "USD" && p.amount_minor > 0)),
    paidLbp: sum(cash.filter((p) => p.currency === "LBP" && p.amount_minor > 0)),
    // older tills recorded the LBP change as a negative line
    changeLbp: -sum(cash.filter((p) => p.currency === "LBP" && p.amount_minor < 0)),
    rate: Number(o.lbp_per_usd),
    date: o.created_at,
    extraRows: [...others].map(([m, cents]) => ({ label: `Paid ${METHOD_EN[m] ?? m}`, value: usd(cents) })),
  };
}

/** Invoice archive + client history: search by invoice number, or by the
 *  client's name/phone to pull their whole purchase history. */
export function Invoices() {
  const supabase = supabaseBrowser();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Inv[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  // a past invoice open for printing: the till receipt (POS) or a packing slip (online)
  const [printing, setPrinting] = useState<Inv | null>(null);
  // photos come from the till's saved catalogue (read after mount: localStorage)
  const [photoOf, setPhotoOf] = useState<ReturnType<typeof variantPhotos>>(() => () => null);
  useEffect(() => setPhotoOf(() => variantPhotos()), []);

  async function search(text: string) {
    setQ(text);
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const t = text.trim().replace(/[,()%*\\]/g, " ").trim();
    if (t.length < 2) {
      setRows([]);
      setSearched(false);
      return;
    }
    setSearched(true);
    const num = /^\d+$/.test(t) ? parseInt(t, 10) : null;
    if (num) {
      const { data } = await supabase.from("orders").select(SELECT).eq("number", num).limit(1);
      setRows((data ?? []) as never);
      return;
    }
    // by client: find matching customers, then their orders newest-first
    const { data: custs } = await supabase
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%`)
      .limit(10);
    const ids = (custs ?? []).map((c) => c.id);
    if (!ids.length) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from("orders")
      .select(SELECT)
      .in("customer_id", ids)
      .order("created_at", { ascending: false })
      .limit(30);
    setRows((data ?? []) as never);
  }

  if (printing) {
    return (
      <div className="mx-auto max-w-md space-y-4 print:m-0 print:max-w-none print:p-0">
        {printing.channel === "pos" ? (
          <ReceiptView receipt={receiptOf(printing)} branchName={printing.branches?.name ?? ""} copy />
        ) : (
          <PackingSlip o={printing} />
        )}
        <div className="flex gap-3 print:hidden">
          <Button className="h-11 flex-1" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            اطبع
          </Button>
          <Button className="h-11 flex-1" variant="outline" onClick={() => setPrinting(null)}>
            رجوع للفواتير
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        value={q}
        placeholder="رقم الفاتورة، أو اسم/تلفون الزبون…"
        className="h-12 text-lg"
        aria-label="فتّش الفواتير"
        onChange={(e) => void search(e.target.value)}
      />
      {searched && rows.length === 0 && (
        <p className="border p-8 text-center text-sm text-muted-foreground">
          ما لقينا ولا فاتورة لـ«{q.trim()}» — جرّب رقم الفاتورة بلا #، أو جزء من اسم الزبون أو آخر أرقام تلفونو.
        </p>
      )}
      {!searched && (
        <EmptyState icon="invoices" title="اكتب رقم الفاتورة (مثلاً 1024) أو اسم/تلفون الزبون لتطلع فواتيرو هون." />
      )}
      {rows.map((o) => (
        <div key={o.id} className="border">
          <button
            type="button"
            className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 p-4 text-start hover:bg-muted/50"
            onClick={() => setOpen(open === o.id ? null : o.id)}
          >
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-lg font-medium" dir="ltr">#{o.number}</span>
              <Badge variant="secondary">{o.channel === "pos" ? "محل" : "أونلاين"}</Badge>
              {o.fulfilment === "pickup" ? <Badge variant="outline">استلام من المحل</Badge> : null}
              <OrderStatus status={o.status} fulfilment={o.fulfilment} />
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground" dir="ltr">
                <Icon name="time" size={14} className="me-1 inline align-[-2px]" />
                {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <span className="font-mono font-medium" dir="ltr">{usd(o.total_usd_cents)}</span>
            </span>
          </button>
          {open === o.id && (
            <div className="space-y-3 border-t p-4 text-sm">
              {o.customers && (
                <p className="text-muted-foreground">
                  <Icon name="user" size={14} className="me-1 inline align-[-2px]" />الزبون: <span className="text-foreground">{o.customers.full_name ?? "—"}</span>
                  <span dir="ltr"> {o.customers.phone}</span>
                  <span className="ms-3"><Icon name="wallet" size={14} className="me-1 inline align-[-2px]" />محفظته: <span className="font-mono" dir="ltr">{usd(o.customers.balance_usd_cents)}</span></span>
                </p>
              )}
              {o.customers && (
                <CustomerPoints
                  key={o.customers.id}
                  customerId={o.customers.id}
                  className="max-w-md"
                  onRedeemed={(credit) => {
                    // the same customer can sit on several invoices in the list
                    const cid = o.customers!.id;
                    setRows((prev) =>
                      prev.map((r) =>
                        r.customers?.id === cid
                          ? { ...r, customers: { ...r.customers, balance_usd_cents: r.customers.balance_usd_cents + credit } }
                          : r,
                      ),
                    );
                  }}
                />
              )}
              <ul className="space-y-1">
                {o.order_items.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-3">
                      <Thumb src={photoOf(i.variant_id)} size="sm" />
                      <span dir="ltr">{i.name_en} — {i.size} {i.color_en} × {i.quantity}</span>
                    </span>
                    <span className="font-mono text-xs" dir="ltr">{usd(i.line_total_usd_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4 border-t pt-2 text-xs text-muted-foreground">
                {o.discount_usd_cents > 0 && <span><Icon name="discount" size={14} className="me-1 inline align-[-2px]" />خصم: <span className="font-mono" dir="ltr">{usd(o.discount_usd_cents)}</span></span>}
                <span className="flex items-center gap-1.5"><Icon name={METHOD_ICON[o.payment_method ?? "cash"] ?? "cash"} size={14} />الدفع: {o.payment_method === "whish" ? "Whish / محفظة" : o.payment_method === "cod" ? "عند الاستلام" : o.payment_method ?? "كاش"}</span>
              </div>
              <Button variant="outline" className="h-10" onClick={() => setPrinting(o)}>
                <Icon name="print" size={16} />
                {o.channel === "pos" ? "اطبع الإيصال مرة تانية" : "اطبع ورقة التجهيز"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Online order packing slip (80mm, same roll as the receipt): what to pick and where it goes. */
function PackingSlip({ o }: { o: Inv }) {
  const pickup = o.fulfilment === "pickup";
  const paidAlready = o.payment_method !== "cod" || (o.order_payments ?? []).length > 0;
  return (
    <>
      <style>{`@media print { @page { size: 80mm auto; margin: 0; } .receipt-80 { width: 72mm; margin: 0 auto; font-size: 11px; } }`}</style>
      <div className="receipt-80 border p-6 print:border-0 print:p-1" dir="ltr">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH WEARS" className="mx-auto h-5 w-auto" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest">Packing slip</p>
          <p className="mt-1 font-mono text-lg">Order #{o.number}</p>
          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-GB")}</p>
        </div>
        <div className="my-4 border-t border-dashed" />
        <div className="space-y-0.5 text-sm">
          <p className="font-semibold">{pickup ? "PICKUP AT THE SHOP" : "DELIVERY"}</p>
          <p>{o.ship_name ?? o.customers?.full_name ?? "—"}</p>
          <p className="font-mono">{o.ship_phone ?? o.customers?.phone ?? ""}</p>
          {!pickup ? <p>{[o.ship_address, o.ship_city].filter(Boolean).join(", ")}</p> : null}
        </div>
        <div className="my-4 border-t border-dashed" />
        {o.order_items.map((i, k) => (
          <div key={k} className="flex justify-between gap-3 py-1 text-sm">
            <span>
              [ ] {i.name_en} — {i.size} {i.color_en}
              {i.sku ? <span className="block font-mono text-xs text-muted-foreground">{i.sku}</span> : null}
            </span>
            <span className="font-mono">× {i.quantity}</span>
          </div>
        ))}
        <div className="my-4 border-t border-dashed" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between font-bold">
            <span>{paidAlready ? "Paid" : pickup ? "To collect at the shop" : "To collect on delivery"}</span>
            <span className="font-mono">{usd(o.total_usd_cents)}</span>
          </div>
          {!paidAlready ? (
            <p className="text-xs text-muted-foreground">
              ≈ LBP {Math.round((o.total_usd_cents / 100) * Number(o.lbp_per_usd)).toLocaleString("en-US")}
            </p>
          ) : null}
        </div>
        {o.note ? <p className="mt-3 text-xs">Note: {o.note}</p> : null}
      </div>
    </>
  );
}
