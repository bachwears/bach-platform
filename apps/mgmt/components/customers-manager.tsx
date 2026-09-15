"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { HintDot } from "@bach/ui/components/hint-dot";

interface Cust {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  balance_usd_cents: number;
  created_at: string;
}

interface Topup {
  id: string;
  customer_id: string;
  amount_usd_cents: number;
  receipt_no: string;
  status: string;
  created_at: string;
  customers: { full_name: string | null; phone: string | null } | null;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;

export function CustomersManager({ canDecide }: { canDecide: boolean }) {
  const supabase = supabaseBrowser();
  const [pending, setPending] = useState<Topup[]>([]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Cust[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<{ id: string; number: number; status: string; channel: string; total_usd_cents: number; created_at: string }>>([]);
  const [tx, setTx] = useState<Array<{ id: string; delta_usd_cents: number; kind: string; note: string | null; created_at: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function loadPending() {
    const { data } = await supabase
      .from("wallet_topups")
      .select("id, customer_id, amount_usd_cents, receipt_no, status, created_at, customers(full_name, phone)")
      .eq("status", "pending")
      .order("created_at");
    setPending((data ?? []) as never);
  }
  useEffect(() => {
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(text: string) {
    setQ(text);
    const t = text.trim();
    if (t.length < 2) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, balance_usd_cents, created_at")
      .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%`)
      .order("created_at", { ascending: false })
      .limit(15);
    setRows((data ?? []) as never);
  }

  async function openCustomer(id: string) {
    setOpen(open === id ? null : id);
    if (open === id) return;
    const [{ data: o }, { data: w }] = await Promise.all([
      supabase.from("orders").select("id, number, status, channel, total_usd_cents, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(30),
      supabase.from("wallet_transactions").select("id, delta_usd_cents, kind, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    setOrders((o ?? []) as never);
    setTx((w ?? []) as never);
  }

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    setErr("");
    const { error } = await supabase.rpc("decide_wallet_topup", { p_topup_id: id, p_approve: approve });
    setBusy(null);
    if (error) {
      setErr(`ما مشي: ${error.message}`);
      return;
    }
    void loadPending();
    if (open) void openCustomer(open);
  }

  const KIND_AR: Record<string, string> = {
    whish_topup: "تعبئة Whish",
    return_credit: "رصيد مرتجع",
    order_payment: "دفع طلب",
    adjustment: "تسوية",
  };

  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          طلبات تعبئة المحفظة المعلقة
          <HintDot
            hint={{
              title: "تعبئة المحفظة عبر Whish",
              what: "الزبون بيبعت المبلغ على Whish وبيسجل الرقم والإيصال من حسابه — وبينطر تأكيدك.",
              source: "وعدنا للزبون: تأكيد خلال 6 ساعات كحد أقصى — الصف الأحمر يعني تجاوزنا الوعد.",
              edit: "تأكد إنو المبلغ وصل فعلاً على Whish قبل ما تكبس تأكيد. التأكيد بيضيف الرصيد فوراً.",
            }}
          />
        </h2>
        {err && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
        {pending.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">ما في طلبات معلقة — كله متأكد.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-start font-medium">الزبون</th>
                  <th className="p-3 text-start font-medium">المبلغ</th>
                  <th className="p-3 text-start font-medium">رقم الإيصال</th>
                  <th className="p-3 text-start font-medium">من قديش</th>
                  <th className="p-3 text-start font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((tp) => {
                  const h = hoursAgo(tp.created_at);
                  const late = h > 6;
                  return (
                    <tr key={tp.id} className={`border-b last:border-0 ${late ? "bg-destructive/5" : ""}`}>
                      <td className="p-3">
                        {tp.customers?.full_name ?? "—"}
                        <span className="block text-xs text-muted-foreground" dir="ltr">{tp.customers?.phone}</span>
                      </td>
                      <td className="p-3 font-mono" dir="ltr">{usd(tp.amount_usd_cents)}</td>
                      <td className="p-3 font-mono text-xs" dir="ltr">{tp.receipt_no}</td>
                      <td className={`p-3 text-xs ${late ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {h < 1 ? `${Math.round(h * 60)} دقيقة` : `${h.toFixed(1)} ساعة`}
                        {late ? " — متأخر عن وعد الـ6 ساعات" : ""}
                      </td>
                      <td className="p-3">
                        {canDecide ? (
                          <div className="flex gap-2">
                            <Button size="sm" disabled={busy === tp.id} onClick={() => void decide(tp.id, true)}>تأكيد</Button>
                            <Button size="sm" variant="ghost" disabled={busy === tp.id} onClick={() => void decide(tp.id, false)}>رفض</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">بحاجة صلاحية مدير</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">العملاء — بحث وسجل الطلبات</h2>
        <Input value={q} placeholder="فتّش بالاسم أو التلفون أو الإيميل…" onChange={(e) => void search(e.target.value)} />
        {rows.map((c) => (
          <div key={c.id} className="rounded-md border">
            <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-start" onClick={() => void openCustomer(c.id)}>
              <span>
                <span className="font-medium">{c.full_name ?? "بلا اسم"}</span>
                <span className="block text-xs text-muted-foreground" dir="ltr">{c.phone} {c.email ? `· ${c.email}` : ""}</span>
              </span>
              <span className="text-sm">
                <span className="text-muted-foreground">المحفظة: </span>
                <span className="font-mono" dir="ltr">{usd(c.balance_usd_cents)}</span>
              </span>
            </button>
            {open === c.id && (
              <div className="grid gap-4 border-t p-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">سجل الطلبات ({orders.length})</p>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ما في طلبات.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {orders.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2">
                          <a href={`/orders/${o.id}`} className="font-mono hover:underline" dir="ltr">#{o.number}</a>
                          <Badge variant="secondary">{o.channel === "pos" ? "محل" : "أونلاين"}</Badge>
                          <span className="text-xs text-muted-foreground">{o.status}</span>
                          <span className="font-mono text-xs" dir="ltr">{usd(o.total_usd_cents)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">حركات المحفظة</p>
                  {tx.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ما في حركات.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {tx.map((w) => (
                        <li key={w.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs">{KIND_AR[w.kind] ?? w.kind}</span>
                          <span className="truncate text-xs text-muted-foreground" dir="ltr">{w.note}</span>
                          <span className={`font-mono text-xs ${w.delta_usd_cents > 0 ? "text-green-600 dark:text-green-400" : ""}`} dir="ltr">
                            {w.delta_usd_cents > 0 ? "+" : ""}{usd(w.delta_usd_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
