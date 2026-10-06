"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { EmptyState } from "@bach/ui/components/empty-state";
import { Icon } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { OrderStatus } from "@bach/ui/components/order-status";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";

const NEXT: Record<string, { to: string; label: string }> = {
  pending: { to: "confirmed", label: "أكّد الطلب" },
  confirmed: { to: "picking", label: "بلّش تجهيز" },
  picking: { to: "packed", label: "جهّز وخصم المخزون" },
  packed: { to: "shipped", label: "سلّم للتوصيل" },
  shipped: { to: "delivered", label: "وصل للزبون" },
  delivered: { to: "completed", label: "سكّر الطلب" },
};

// Pickup orders walk the same statuses: 'shipped' = ready for pickup, 'delivered' = collected.
const PICKUP_NEXT: Record<string, { to: string; label: string }> = {
  packed: { to: "shipped", label: "جاهز للاستلام — بلّغ الزبون" },
  shipped: { to: "delivered", label: "انستلم" },
};

const CANCELLABLE = new Set(["pending", "confirmed", "picking"]);

interface QueueOrder {
  id: string;
  number: number;
  status: string;
  fulfilment: string | null;
  payment_method: string | null;
  total_usd_cents: number;
  created_at: string;
  ship_name: string | null;
  ship_phone: string | null;
  ship_city: string | null;
  ship_address: string | null;
  note: string | null;
  order_items: Array<{
    name_en: string;
    size: string;
    color_en: string;
    sku: string | null;
    quantity: number;
    product_variants: { product_id: string } | null;
  }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
const lbp = (n: number) => `${n.toLocaleString("en-US")} ل.ل`;
/** LBP change is rounded down to this step (same as the cashier). */
const CHANGE_STEP_LBP = 5_000;
/** "12.5" → 1250; blank or junk → 0. */
const toCents = (v: string) => Math.max(0, Math.round((Number(v.replace(/,/g, "")) || 0) * 100));
const toLbp = (v: string) => Math.max(0, Math.round(Number(v.replace(/,/g, "")) || 0));

/**
 * Collecting a pickup paid at the counter in any mix of dollars, lira and Whish.
 * Records only what stays in the drawer: change comes back in dollars when the
 * dollars cover it, otherwise in lira (rounded down to 5,000).
 */
function CollectPanel({
  total,
  busy,
  onCollect,
  onClose,
}: {
  total: number;
  busy: boolean;
  onCollect: (paid: { usd: number; lbp: number; whish: number }) => void;
  onClose: () => void;
}) {
  const [usdIn, setUsdIn] = useState("");
  const [lbpIn, setLbpIn] = useState("");
  const [whishIn, setWhishIn] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [rateErr, setRateErr] = useState("");

  useEffect(() => {
    void supabaseBrowser()
      .from("exchange_rates")
      .select("lbp_per_usd")
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setRateErr("ما قدرنا نجيب سعر الصرف — الدفع بالليرة مش متاح هلّق.");
        else setRate(Number(data.lbp_per_usd));
      });
  }, []);

  const paidUsd = toCents(usdIn);
  const paidLbp = toLbp(lbpIn);
  const paidWhish = toCents(whishIn);
  const lbpCents = rate && paidLbp ? Math.round((paidLbp / rate) * 100) : 0;
  const covered = paidUsd + lbpCents + paidWhish;
  const short = total - covered;
  const over = Math.max(0, covered - total);
  // Whish is exact by nature: never more than the order
  const whishTooMuch = paidWhish > total;
  const changeUsd = over > 0 && paidUsd >= over ? over : 0;
  const changeLbp =
    over > 0 && !changeUsd && rate ? Math.floor((over / 100) * rate / CHANGE_STEP_LBP) * CHANGE_STEP_LBP : 0;
  const lbpChangeTooBig = changeLbp > paidLbp;
  const ok = short <= 5 && !whishTooMuch && !lbpChangeTooBig && (paidLbp === 0 || rate !== null) && covered > 0;

  return (
    <div className="w-full space-y-3 border p-3">
      <p className="text-sm font-medium">قبض طلب الاستلام — المطلوب {usd(total)}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Icon name="cash" size={14} />كاش دولار ($)</span>
          <Input inputMode="decimal" dir="ltr" value={usdIn} onChange={(e) => setUsdIn(e.target.value)} placeholder="0" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Icon name="cash" size={14} />كاش ليرة (ل.ل)</span>
          <Input
            inputMode="numeric"
            dir="ltr"
            value={lbpIn}
            disabled={rate === null}
            onChange={(e) => setLbpIn(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Icon name="whish" size={14} />Whish ($)</span>
          <Input inputMode="decimal" dir="ltr" value={whishIn} onChange={(e) => setWhishIn(e.target.value)} placeholder="0" />
        </label>
      </div>
      {rateErr && <p className="text-xs text-destructive">{rateErr}</p>}
      <div className="space-y-1 text-sm">
        {paidLbp > 0 && rate ? (
          <p className="text-muted-foreground">
            {lbp(paidLbp)} = {usd(lbpCents)}
          </p>
        ) : null}
        {short > 5 ? (
          <p>باقي: {usd(short)}{rate ? ` (${lbp(Math.ceil((short / 100) * rate))})` : ""}</p>
        ) : changeUsd > 0 ? (
          <p className="font-medium">الباقي للزبون: {usd(changeUsd)}</p>
        ) : changeLbp > 0 ? (
          <p className="font-medium">الباقي للزبون: {lbp(changeLbp)}</p>
        ) : covered > 0 ? (
          <p className="text-muted-foreground">المبلغ مزبوط.</p>
        ) : null}
        {whishTooMuch && <p className="text-destructive">Whish ما بيصير أكتر من المطلوب.</p>}
        {lbpChangeTooBig && <p className="text-destructive">الباقي بالليرة أكبر من الليرة يلي قبضتها — رجّع الباقي بالدولار أو صحّح المبالغ.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-10"
          disabled={busy || !ok}
          onClick={() => onCollect({ usd: paidUsd - changeUsd, lbp: paidLbp - changeLbp, whish: paidWhish })}
        >
          {busy ? "لحظة…" : "انستلم — سجّل الدفع"}
        </Button>
        <Button variant="outline" className="h-10" disabled={busy} onClick={onClose}>
          رجوع
        </Button>
      </div>
    </div>
  );
}

export function FulfillmentQueue() {
  const supabase = supabaseBrowser();
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  // a failed load used to look like "no orders" — the team would think everything shipped
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  // the pickup order whose mixed-payment panel is open
  const [collecting, setCollecting] = useState<string | null>(null);
  // small photos so the picker grabs the right piece
  const [photos, setPhotos] = useState<PhotoMap | null>(null);
  useEffect(() => {
    void loadFrontPhotos(supabaseBrowser()).then(setPhotos);
  }, []);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("orders")
      .select(
        "id, number, status, fulfilment, payment_method, total_usd_cents, created_at, ship_name, ship_phone, ship_city, ship_address, note, order_items(name_en, size, color_en, sku, quantity, product_variants(product_id))",
      )
      .eq("channel", "online")
      .in("status", ["pending", "confirmed", "picking", "packed", "shipped", "delivered"])
      .order("created_at", { ascending: true });
    if (err || !data) {
      setLoadError(`ما قدرنا نحمّل الطلبات: ${err?.message ?? "خطأ بالاتصال"}`);
      return;
    }
    setLoadError("");
    setLoaded(true);
    setOrders(data as unknown as QueueOrder[]);
  }, [supabase]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  /**
   * `paid`: what a pickup paid at the counter (dollars, lira, Whish) — without
   * it a cash-on-delivery order is recorded as the full total in dollars.
   */
  async function advance(id: string, to: string, paid?: { usd: number; lbp: number; whish: number }) {
    setBusy(id);
    setError("");
    const { error: err } = await supabase.rpc("advance_online_order", {
      p_order_id: id,
      p_next: to,
      ...(paid ? { p_paid_usd_cents: paid.usd, p_paid_lbp: paid.lbp, p_paid_whish_usd_cents: paid.whish } : {}),
    });
    setBusy(null);
    if (err) {
      setError(`ما مشي الحال: ${err.message}`);
      return;
    }
    setCollecting(null);
    void load();
  }

  return (
    <div className="space-y-4">
      {error && <p className="border border-destructive/40 px-4 py-2 text-sm text-destructive">{error}</p>}
      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-destructive/40 px-4 py-2 text-sm text-destructive">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <Icon name="refresh" size={16} />
            جرّب مرة تانية
          </Button>
        </div>
      )}
      {orders.length === 0 ? (
        loaded && !loadError ? (
          <EmptyState icon="online" title="ما في طلبات أونلاين مفتوحة حالياً — كل شي مسكّر.">
            أول طلب جديد من bachwears.com بيطلع هون لحالو (الصفحة بتتحدّث كل 30 ثانية).
          </EmptyState>
        ) : null
      ) : (
        orders.map((o) => {
          const pickup = o.fulfilment === "pickup";
          const next = (pickup ? PICKUP_NEXT[o.status] : undefined) ?? NEXT[o.status];
          // collecting a pay-at-the-shop order: cash or Whish at the counter
          const collectAtShop = pickup && o.status === "shipped" && o.payment_method === "cod";
          return (
          <div key={o.id} className="space-y-3 border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-lg font-medium">#{o.number}</span>
                <OrderStatus status={o.status} fulfilment={o.fulfilment} />
                {pickup ? <Badge variant="outline">استلام من المحل</Badge> : null}
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <span className="font-mono font-medium">{usd(o.total_usd_cents)}</span>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground"><Icon name="user" size={14} className="me-1 inline align-[-2px]" />الزبون: </span>
                {o.ship_name} · <span dir="ltr">{o.ship_phone}</span>
              </p>
              {pickup ? (
                <p>
                  <span className="text-muted-foreground"><Icon name="branch" size={14} className="me-1 inline align-[-2px]" />التسليم: </span>
                  الزبون بيستلم من المحل
                  {o.payment_method === "cod" ? " — بيدفع هون (كاش أو Whish)" : " — مدفوع سلف"}
                </p>
              ) : (
                <p>
                  <span className="text-muted-foreground"><Icon name="address" size={14} className="me-1 inline align-[-2px]" />العنوان: </span>
                  {o.ship_city} — {o.ship_address}
                </p>
              )}
            </div>
            {o.note && <p className="text-sm text-muted-foreground"><Icon name="note" size={14} className="me-1 inline align-[-2px]" />ملاحظة: {o.note}</p>}

            <ul className="space-y-1 bg-muted/50 p-3 text-sm">
              {o.order_items.map((i, idx) => (
                <li key={idx} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex min-w-0 items-center gap-3">
                    <Thumb src={photoFor(photos, i.product_variants?.product_id, i.color_en)} />
                    <span>
                      {i.name_en} — {i.size} {i.color_en} × {i.quantity}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {i.sku}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              {collectAtShop ? (
                <>
                  <Button className="h-10" disabled={busy === o.id} onClick={() => void advance(o.id, "delivered")}>
                    <Icon name="cash" size={16} />
                    {busy === o.id ? "لحظة…" : `انستلم — قبضنا ${usd(o.total_usd_cents)} كاش`}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={busy === o.id}
                    onClick={() => void advance(o.id, "delivered", { usd: 0, lbp: 0, whish: o.total_usd_cents })}
                  >
                    <Icon name="whish" size={16} />
                    انستلم — دفع Whish
                  </Button>
                  {collecting === o.id ? (
                    <CollectPanel
                      total={o.total_usd_cents}
                      busy={busy === o.id}
                      onCollect={(paid) => void advance(o.id, "delivered", paid)}
                      onClose={() => setCollecting(null)}
                    />
                  ) : (
                    <Button variant="outline" className="h-10" disabled={busy === o.id} onClick={() => setCollecting(o.id)}>
                      <Icon name="cash" size={16} />
                      ليرة أو دفع مختلط…
                    </Button>
                  )}
                </>
              ) : next ? (
                <Button className="h-10" disabled={busy === o.id} onClick={() => void advance(o.id, next.to)}>
                  {busy === o.id ? "لحظة…" : next.label}
                </Button>
              ) : null}
              {CANCELLABLE.has(o.status) && (
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={busy === o.id}
                  onClick={() => {
                    if (window.confirm(`إلغاء الطلب #${o.number}؟ المخزون المحجوز بيرجع متاح.`)) {
                      void advance(o.id, "cancelled");
                    }
                  }}
                >
                  ألغِ الطلب
                </Button>
              )}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
