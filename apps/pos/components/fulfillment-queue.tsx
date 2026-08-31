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

const CANCELLABLE = new Set(["pending", "confirmed", "picking"]);

interface QueueOrder {
  id: string;
  number: number;
  status: string;
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

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, number, status, total_usd_cents, created_at, ship_name, ship_phone, ship_city, ship_address, note, order_items(name_en, size, color_en, sku, quantity)",
      )
      .eq("channel", "online")
      .in("status", ["pending", "confirmed", "picking", "packed", "shipped", "delivered"])
      .order("created_at", { ascending: true });
    setOrders((data ?? []) as unknown as QueueOrder[]);
  }, [supabase]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function advance(id: string, to: string) {
    setBusy(id);
    setError("");
    const { error: err } = await supabase.rpc("advance_online_order", { p_order_id: id, p_next: to });
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
      {orders.length === 0 ? (
        <p className="p-10 text-center text-muted-foreground">ما في طلبات أونلاين حالياً — كل شي مسكّر. 🖤</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold">#{o.number}</span>
                <Badge variant={o.status === "pending" ? "default" : "secondary"}>
                  {STATUS_AR[o.status] ?? o.status}
                </Badge>
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
              <p>
                <span className="text-muted-foreground">العنوان: </span>
                {o.ship_city} — {o.ship_address}
              </p>
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
              {NEXT[o.status] && (
                <Button disabled={busy === o.id} onClick={() => void advance(o.id, NEXT[o.status]!.to)}>
                  {busy === o.id ? "لحظة…" : NEXT[o.status]!.label}
                </Button>
              )}
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
        ))
      )}
    </div>
  );
}
