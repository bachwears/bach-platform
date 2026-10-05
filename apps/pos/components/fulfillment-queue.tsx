"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";

const STATUS_AR: Record<string, string> = {
  pending: "جديد",
  confirmed: "مؤكّد",
  picking: "قيد التجهيز",
  packed: "جاهز",
  shipped: "بالشحن",
  delivered: "وصل",
};

const NEXT: Record<string, { to: string; label: string }> = {
  pending: { to: "confirmed", label: "أكّد الطلب" },
  confirmed: { to: "picking", label: "بلّش تجهيز" },
  picking: { to: "packed", label: "جهّز وخصم المخزون" },
  packed: { to: "shipped", label: "سلّم للتوصيل" },
  shipped: { to: "delivered", label: "وصل للزبون" },
  delivered: { to: "completed", label: "سكّر الطلب" },
};

// Pickup orders walk the same statuses: 'shipped' = ready for pickup, 'delivered' = collected.
const PICKUP_STATUS_AR: Record<string, string> = { shipped: "جاهز للاستلام", delivered: "انستلم" };
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
  order_items: Array<{ name_en: string; size: string; color_en: string; sku: string | null; quantity: number }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function FulfillmentQueue() {
  const supabase = supabaseBrowser();
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  // a failed load used to look like "no orders" — the team would think everything shipped
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("orders")
      .select(
        "id, number, status, fulfilment, payment_method, total_usd_cents, created_at, ship_name, ship_phone, ship_city, ship_address, note, order_items(name_en, size, color_en, sku, quantity)",
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

  /** `whishCents`: a pickup paid by Whish at the counter (otherwise the total is recorded as cash). */
  async function advance(id: string, to: string, whishCents?: number) {
    setBusy(id);
    setError("");
    const { error: err } = await supabase.rpc("advance_online_order", {
      p_order_id: id,
      p_next: to,
      ...(whishCents ? { p_paid_usd_cents: 0, p_paid_lbp: 0, p_paid_whish_usd_cents: whishCents } : {}),
    });
    setBusy(null);
    if (err) {
      setError(`ما مشي الحال: ${err.message}`);
      return;
    }
    void load();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            جرّب مرة تانية
          </Button>
        </div>
      )}
      {orders.length === 0 ? (
        loaded && !loadError ? (
          <p className="p-10 text-center text-muted-foreground">ما في طلبات أونلاين حالياً — كل شي مسكّر.</p>
        ) : null
      ) : (
        orders.map((o) => {
          const pickup = o.fulfilment === "pickup";
          const next = (pickup ? PICKUP_NEXT[o.status] : undefined) ?? NEXT[o.status];
          // collecting a pay-at-the-shop order: cash or Whish at the counter
          const collectAtShop = pickup && o.status === "shipped" && o.payment_method === "cod";
          return (
          <div key={o.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold">#{o.number}</span>
                <Badge variant={o.status === "pending" ? "default" : "secondary"}>
                  {(pickup ? PICKUP_STATUS_AR[o.status] : undefined) ?? STATUS_AR[o.status] ?? o.status}
                </Badge>
                {pickup ? <Badge variant="outline">استلام من المحل</Badge> : null}
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <span className="font-mono font-medium">{usd(o.total_usd_cents)}</span>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">الزبون: </span>
                {o.ship_name} · <span dir="ltr">{o.ship_phone}</span>
              </p>
              {pickup ? (
                <p>
                  <span className="text-muted-foreground">التسليم: </span>
                  الزبون بيستلم من المحل
                  {o.payment_method === "cod" ? " — بيدفع هون (كاش أو Whish)" : " — مدفوع سلف"}
                </p>
              ) : (
                <p>
                  <span className="text-muted-foreground">العنوان: </span>
                  {o.ship_city} — {o.ship_address}
                </p>
              )}
            </div>
            {o.note && <p className="text-sm text-muted-foreground">ملاحظة: {o.note}</p>}

            <ul className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
              {o.order_items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {i.name_en} — {i.size} {i.color_en} × {i.quantity}
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
                  <Button disabled={busy === o.id} onClick={() => void advance(o.id, "delivered")}>
                    {busy === o.id ? "لحظة…" : `انستلم — قبضنا ${usd(o.total_usd_cents)} كاش`}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy === o.id}
                    onClick={() => void advance(o.id, "delivered", o.total_usd_cents)}
                  >
                    انستلم — دفع Whish
                  </Button>
                </>
              ) : next ? (
                <Button disabled={busy === o.id} onClick={() => void advance(o.id, next.to)}>
                  {busy === o.id ? "لحظة…" : next.label}
                </Button>
              ) : null}
              {CANCELLABLE.has(o.status) && (
                <Button
                  variant="outline"
                  disabled={busy === o.id}
                  onClick={() => {
                    if (window.confirm(`إلغاء الطلب #${o.number}؟ المخزون المحجوز بيرجع متاح.`)) {
                      void advance(o.id, "cancelled");
                    }
                  }}
                >
                  إلغاء
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
