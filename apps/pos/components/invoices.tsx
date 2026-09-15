"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Input } from "@bach/ui/components/input";

interface Inv {
  id: string;
  number: number;
  status: string;
  channel: string;
  total_usd_cents: number;
  discount_usd_cents: number;
  payment_method: string | null;
  created_at: string;
  customers: { id: string; full_name: string | null; phone: string | null; balance_usd_cents: number } | null;
  order_items: Array<{ name_en: string; size: string; color_en: string; quantity: number; line_total_usd_cents: number }>;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const SELECT =
  "id, number, status, channel, total_usd_cents, discount_usd_cents, payment_method, created_at, customers(id, full_name, phone, balance_usd_cents), order_items(name_en, size, color_en, quantity, line_total_usd_cents)";

/** Invoice archive + client history: search by invoice number, or by the
 *  client's name/phone to pull their whole purchase history. */
export function Invoices() {
  const supabase = supabaseBrowser();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Inv[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(text: string) {
    setQ(text);
    const t = text.trim();
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

  return (
    <div className="space-y-4">
      <Input
        value={q}
        placeholder="رقم الفاتورة، أو اسم/تلفون الزبون…"
        className="h-12 text-lg"
        onChange={(e) => void search(e.target.value)}
      />
      {searched && rows.length === 0 && (
        <p className="rounded-md border p-8 text-center text-muted-foreground">ما لقينا شي.</p>
      )}
      {rows.map((o) => (
        <div key={o.id} className="rounded-lg border">
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-start"
            onClick={() => setOpen(open === o.id ? null : o.id)}
          >
            <span className="flex items-center gap-3">
              <span className="font-mono text-lg font-semibold" dir="ltr">#{o.number}</span>
              <Badge variant="secondary">{o.channel === "pos" ? "محل" : "أونلاين"}</Badge>
              <span className="text-xs text-muted-foreground">{o.status}</span>
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <span className="font-mono font-medium" dir="ltr">{usd(o.total_usd_cents)}</span>
            </span>
          </button>
          {open === o.id && (
            <div className="space-y-3 border-t p-4 text-sm">
              {o.customers && (
                <p className="text-muted-foreground">
                  الزبون: <span className="text-foreground">{o.customers.full_name ?? "—"}</span>
                  <span dir="ltr"> {o.customers.phone}</span>
                  <span className="ms-3">محفظته: <span className="font-mono" dir="ltr">{usd(o.customers.balance_usd_cents)}</span></span>
                </p>
              )}
              <ul className="space-y-1">
                {o.order_items.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span dir="ltr">{i.name_en} — {i.size} {i.color_en} × {i.quantity}</span>
                    <span className="font-mono text-xs" dir="ltr">{usd(i.line_total_usd_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4 border-t pt-2 text-xs text-muted-foreground">
                {o.discount_usd_cents > 0 && <span>خصم: <span className="font-mono" dir="ltr">{usd(o.discount_usd_cents)}</span></span>}
                <span>الدفع: {o.payment_method === "whish" ? "Whish / محفظة" : o.payment_method === "cod" ? "عند الاستلام" : o.payment_method ?? "كاش"}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
