"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

export interface WaitingOrder {
  id: string;
  number: number;
  total_usd_cents: number;
  delivered_at: string | null;
  ship_name: string | null;
  ship_city: string | null;
}

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const days = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null);

const DESTINATIONS: Array<[string, string]> = [
  ["drawer", "درج المحل"],
  ["safe", "الخزنة"],
  ["bank", "البنك"],
  ["other", "غير مكان"],
];

/**
 * Delivered cash-on-delivery orders whose money is still with the courier.
 * Tick the ones the courier paid for, enter what was received and where it
 * went, and record it: the orders leave this list and join the history.
 */
export function CourierCash({ orders, canRecord }: { orders: WaitingOrder[]; canRecord: boolean }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [usdIn, setUsdIn] = useState("");
  const [lbpIn, setLbpIn] = useState("");
  const [dest, setDest] = useState("drawer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const expected = useMemo(() => orders.filter((o) => picked.has(o.id)).reduce((s, o) => s + o.total_usd_cents, 0), [orders, picked]);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function record() {
    const usdCents = Math.round((parseFloat(usdIn.replace(/,/g, "")) || 0) * 100);
    const lbp = Math.round(parseFloat(lbpIn.replace(/,/g, "")) || 0);
    if (!picked.size) return setMsg({ ok: false, text: "علّم الطلبات يلي انقبضت." });
    if (usdCents <= 0 && lbp <= 0) return setMsg({ ok: false, text: "اكتب المبلغ يلي استلمتو." });
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().rpc("record_courier_settlement", {
      p_order_ids: [...picked],
      p_usd_cents: usdCents,
      p_lbp: lbp,
      p_destination: dest,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `ما انحفظ: ${error.message}` });
    setPicked(new Set());
    setUsdIn("");
    setLbpIn("");
    setNote("");
    setMsg({ ok: true, text: "انسجّل الاستلام." });
    router.refresh();
  }

  if (!orders.length) return <p className="border p-6 text-center text-sm text-muted-foreground">ما في مصاري عند شركة الشحن هلّق.</p>;

  return (
    <div className="space-y-4">
      <ul className="divide-y border">
        {orders.map((o) => {
          const d = days(o.delivered_at);
          return (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/50">
                {canRecord && (
                  <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} className="h-5 w-5 accent-foreground" />
                )}
                <span className="font-mono" dir="ltr">
                  #{o.number}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {o.ship_name ?? "—"}
                  {o.ship_city ? <span className="text-muted-foreground"> · {o.ship_city}</span> : null}
                </span>
                <span className={`text-xs ${d != null && d > 7 ? "text-destructive" : "text-muted-foreground"}`}>
                  {d == null ? "" : d === 0 ? "وصل اليوم" : `من ${d} يوم`}
                </span>
                <span className="font-mono">{usd(o.total_usd_cents)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {canRecord ? (
        <div className="space-y-3 border p-4">
          <p className="text-sm font-medium">
            استلمنا من شركة الشحن — {picked.size} طلب{picked.size ? ` · المتوقّع ${usd(expected)}` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              دولار ($)
              <Input inputMode="decimal" dir="ltr" value={usdIn} onChange={(e) => setUsdIn(e.target.value)} placeholder={expected ? (expected / 100).toFixed(2) : "0"} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              ليرة (ل.ل)
              <Input inputMode="numeric" dir="ltr" value={lbpIn} onChange={(e) => setLbpIn(e.target.value)} placeholder="0" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              وين انحطّت المصاري
              <select value={dest} onChange={(e) => setDest(e.target.value)} className="h-10 border bg-transparent px-2 text-sm text-foreground">
                {DESTINATIONS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري): مثلاً رقم إيصال الشركة" />
          <div className="flex items-center gap-3">
            <Button disabled={busy || !picked.size} onClick={() => void record()}>
              {busy ? "عم نسجّل…" : "سجّل الاستلام"}
            </Button>
            {msg && <span className={`text-sm ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            إذا المبلغ مش متل المتوقّع، سجّل يلي استلمتو فعلياً — الفرق بيبيّن بالتاريخ تحت. يلي انحطّ بدرج المحل بينحسب بتقرير آخر النهار.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">تسجيل الاستلام للمدير أو السوبر أدمن.</p>
      )}
    </div>
  );
}
