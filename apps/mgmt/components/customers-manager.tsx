"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { HintDot } from "@bach/ui/components/hint-dot";

import { NOT_SAVED } from "../lib/access";
import { STATUS_LABELS } from "../lib/order-status";
import { fmt } from "../lib/time";

interface Cust {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  balance_usd_cents: number;
  points_balance?: number; // loyalty migration; absent until it lands
  created_at: string;
  birthday: string | null;
  marketing_consent: boolean | null;
  size_top?: string | null;
  size_bottom?: string | null;
  size_shoe?: string | null;
  orders: Array<{ total_usd_cents: number; status: string }>;
}

// "*" keeps optional columns (sizes) working whatever migrations have landed
const CUST_SELECT = "*, orders(total_usd_cents, status)";
const DEAD = new Set(["cancelled", "returned"]);

interface Topup {
  id: string;
  customer_id: string;
  amount_usd_cents: number;
  receipt_no: string;
  status: string;
  created_at: string;
  customers: { full_name: string | null; phone: string | null } | null;
}

interface PointsMove {
  id: number;
  delta: number;
  kind: string;
  note: string | null;
  created_at: string;
}

interface Loyalty {
  enabled: boolean;
  reward_points: number;
  reward_usd_cents: number;
}

const PTS_KIND_AR: Record<string, string> = {
  earn: "ربح من طلب",
  reverse: "سحب بسبب مرتجع",
  redeem: "تحويل لرصيد",
  expire: "انتهاء",
  adjust: "تعديل يدوي",
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const day = (iso: string) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;

/**
 * canAdjust: super_admin/store_manager (adjust_points); canRedeem: those plus
 * cashier (redeem_points for a customer). The database enforces both.
 */
export function CustomersManager({ canDecide, canAdjust, canRedeem }: { canDecide: boolean; canAdjust: boolean; canRedeem: boolean }) {
  const supabase = supabaseBrowser();
  const [pending, setPending] = useState<Topup[]>([]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Cust[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<{ id: string; number: number; status: string; channel: string; total_usd_cents: number; created_at: string }>>([]);
  const [tx, setTx] = useState<Array<{ id: string; delta_usd_cents: number; kind: string; note: string | null; created_at: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  // null = programme not in the database (yet): every points block hides
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [pts, setPts] = useState<PointsMove[] | null>(null);
  const [adjDelta, setAdjDelta] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [ptsBusy, setPtsBusy] = useState(false);
  const [ptsMsg, setPtsMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    void supabase.rpc("loyalty_settings").then(({ data, error }) => {
      const row = (Array.isArray(data) ? data[0] : data) as Loyalty | null;
      if (!error && row?.reward_points) setLoyalty(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Newest customers until something is typed.
  async function search(text: string) {
    setQ(text);
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the query
    const t = text.trim().replace(/[,()%*\\]/g, " ").trim();
    let query = supabase.from("customers").select(CUST_SELECT).order("created_at", { ascending: false });
    if (t.length >= 2) {
      const digits = t.replace(/\D/g, "");
      const parts = [`full_name.ilike.%${t}%`, `email.ilike.%${t}%`, `phone.ilike.%${t}%`];
      // "70 000 001" or "+961 70…" should still find "+96170000001"
      if (digits.length >= 3) parts.push(`phone.ilike.%${digits}%`);
      query = query.or(parts.join(","));
    }
    const { data, error } = await query.limit(t.length >= 2 ? 30 : 50);
    if (error) setErr(`ما مشي البحث: ${error.message}`);
    setRows((data ?? []) as never);
  }
  useEffect(() => {
    void search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCustomer(id: string) {
    setOpen(open === id ? null : id);
    if (open === id) return;
    setPts(null);
    setPtsMsg(null);
    setAdjDelta("");
    setAdjNote("");
    const [{ data: o }, { data: w }, { data: p, error: pErr }] = await Promise.all([
      supabase.from("orders").select("id, number, status, channel, total_usd_cents, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(30),
      supabase.from("wallet_transactions").select("id, delta_usd_cents, kind, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("loyalty_points").select("id, delta, kind, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    setOrders((o ?? []) as never);
    setTx((w ?? []) as never);
    setPts(pErr ? null : ((p ?? []) as never));
  }

  // After a points change: fresh balances on the row, plus both histories.
  async function reloadBalances(id: string) {
    const [{ data: c }, { data: w }, { data: p }] = await Promise.all([
      supabase.from("customers").select("balance_usd_cents, points_balance").eq("id", id).maybeSingle(),
      supabase.from("wallet_transactions").select("id, delta_usd_cents, kind, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("loyalty_points").select("id, delta, kind, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (c) setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...c } : r)));
    setTx((w ?? []) as never);
    if (p) setPts(p as never);
  }

  async function redeemFor(c: Cust) {
    if (!loyalty || typeof c.points_balance !== "number") return;
    const rewards = Math.floor(c.points_balance / loyalty.reward_points);
    if (!rewards) return;
    if (!window.confirm(`نحوّل ${rewards * loyalty.reward_points} نقطة لـ${usd(rewards * loyalty.reward_usd_cents)} رصيد بمحفظة ${c.full_name ?? "الزبون"}؟`)) return;
    setPtsBusy(true);
    setPtsMsg(null);
    const { data, error } = await supabase.rpc("redeem_points", { p_customer_id: c.id });
    setPtsBusy(false);
    if (error) {
      setPtsMsg({
        bad: true,
        text: error.message.includes("not enough")
          ? "النقاط ما بتكفي للتحويل."
          : error.message.includes("paused")
            ? "البرنامج موقّف — شغّلو من التسويق ← برنامج النقاط."
            : error.message.includes("customer not found")
              ? NOT_SAVED
              : `ما مشي التحويل: ${error.message}`,
      });
      return;
    }
    const r = (Array.isArray(data) ? data[0] : data) as { points_used: number; credit_usd_cents: number } | null;
    setPtsMsg({ text: `تمّ — ${r?.points_used ?? 0} نقطة صاروا ${usd(r?.credit_usd_cents ?? 0)} بالمحفظة.` });
    void reloadBalances(c.id);
  }

  async function adjust(c: Cust) {
    const raw = adjDelta.trim();
    const delta = /^[+-]?\d{1,6}$/.test(raw) ? parseInt(raw, 10) : 0;
    if (!delta) {
      setPtsMsg({ bad: true, text: "اكتب عدد نقاط صحيح، مثلاً 50 للزيادة أو ‎-50 للنقصان." });
      return;
    }
    if (!adjNote.trim()) {
      setPtsMsg({ bad: true, text: "السبب إجباري — بيبيّن بسجل النقاط." });
      return;
    }
    setPtsBusy(true);
    setPtsMsg(null);
    const { data, error } = await supabase.rpc("adjust_points", { p_customer_id: c.id, p_delta: delta, p_note: adjNote.trim() });
    setPtsBusy(false);
    if (error) {
      setPtsMsg({
        bad: true,
        text: error.message.includes("not allowed")
          ? NOT_SAVED
          : error.message.includes("reason")
            ? "السبب إجباري."
            : `ما انحفظ التعديل: ${error.message}`,
      });
      return;
    }
    const applied = typeof data === "number" ? data : delta;
    setPtsMsg(
      applied === 0
        ? { bad: true, text: "ما تغيّر شي — الرصيد صفر وما بينزل تحت الصفر." }
        : { text: `انحفظ — ${applied > 0 ? "+" : ""}${applied} نقطة.${applied !== delta ? " (النقصان وقف عند الصفر)" : ""}` },
    );
    setAdjDelta("");
    setAdjNote("");
    void reloadBalances(c.id);
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
    order_refund: "استرجاع طلب",
    loyalty_reward: "مكافأة نقاط",
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
                        <span className="block" dir="ltr">{fmt(tp.created_at, { dateStyle: "short", timeStyle: "short" })}</span>
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
        <p className="text-xs text-muted-foreground">
          {q.trim().length >= 2 ? `${rows.length} نتيجة` : `آخر ${rows.length} عميل — فتّش لتلاقي غيرن`}
        </p>
        {rows.map((c) => {
          const live = (c.orders ?? []).filter((o) => !DEAD.has(o.status));
          const spent = live.reduce((n, o) => n + o.total_usd_cents, 0);
          const sizes = [
            c.size_top ? `فوق ${c.size_top}` : "",
            c.size_bottom ? `تحت ${c.size_bottom}` : "",
            c.size_shoe ? `حذاء ${c.size_shoe}` : "",
          ].filter(Boolean);
          return (
          <div key={c.id} className="rounded-md border">
            <button
              type="button"
              aria-expanded={open === c.id}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-start"
              onClick={() => void openCustomer(c.id)}
            >
              <span className="min-w-0">
                <span className="font-medium">{c.full_name ?? "بلا اسم"}</span>
                <span className="block text-xs text-muted-foreground" dir="ltr">{c.phone} {c.email ? `· ${c.email}` : ""}</span>
              </span>
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span>
                  <span className="text-muted-foreground">طلبات: </span>
                  <span className="font-mono">{live.length}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">صرف: </span>
                  <span className="font-mono" dir="ltr">{usd(spent)}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">المحفظة: </span>
                  <span className="font-mono" dir="ltr">{usd(c.balance_usd_cents)}</span>
                </span>
                {loyalty && typeof c.points_balance === "number" && (
                  <span>
                    <span className="text-muted-foreground">النقاط: </span>
                    <span className="font-mono" dir="ltr">{c.points_balance}</span>
                  </span>
                )}
              </span>
            </button>
            {open === c.id && (
              <div className="space-y-4 border-t p-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">عميل من</dt>
                  <dd>{day(c.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">عيد الميلاد</dt>
                  <dd>{c.birthday ? fmt(`${c.birthday}T12:00:00Z`, { day: "numeric", month: "long" }) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">عروض وتسويق</dt>
                  <dd>{c.marketing_consent ? "موافق" : "مش موافق"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">المقاسات</dt>
                  <dd dir="ltr" className="text-end sm:text-start">{sizes.length ? sizes.join(" · ") : "—"}</dd>
                </div>
              </dl>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">سجل الطلبات ({orders.length})</p>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ما في طلبات.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {orders.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2">
                          <a href={`/orders/${o.id}`} className="font-mono hover:underline" dir="ltr">#{o.number}</a>
                          <span className="text-xs text-muted-foreground">{day(o.created_at)}</span>
                          <Badge variant="secondary">{o.channel === "pos" ? "محل" : "أونلاين"}</Badge>
                          <span className="text-xs text-muted-foreground">{STATUS_LABELS[o.status] ?? o.status}</span>
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
                          <span className="text-xs">
                            {KIND_AR[w.kind] ?? w.kind}
                            <span className="block text-muted-foreground">{day(w.created_at)}</span>
                          </span>
                          <span className="truncate text-xs text-muted-foreground" dir="ltr">{w.note}</span>
                          <span className={`font-mono text-xs ${w.delta_usd_cents > 0 ? "text-green-600 dark:text-green-400" : ""}`} dir="ltr">
                            {w.delta_usd_cents > 0 ? "+" : ""}{usd(w.delta_usd_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {loyalty && typeof c.points_balance === "number" && pts && (
                    <div className="mt-6 space-y-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        النقاط: <span className="font-mono" dir="ltr">{c.points_balance}</span>
                        <span className="font-normal text-muted-foreground" dir="ltr">
                          (= {usd(Math.floor(c.points_balance / loyalty.reward_points) * loyalty.reward_usd_cents)})
                        </span>
                        <HintDot
                          hint={{
                            title: "نقاط الزبون",
                            what: `بتنزل لحالها لما يكمل بيع بالمحل أو يوصل طلب أونلاين، وبتنسحب مع المرتجع. كل ${loyalty.reward_points} نقطة = ${usd(loyalty.reward_usd_cents)} رصيد بالمحفظة.`,
                            source: "رصيد النقاط من جدول العملاء، والحركات من سجل النقاط (loyalty_points).",
                            edit: "التحويل لرصيد: الزبون من حسابو، أو الكاشير/المدير من هون أو من الكاشير. التعديل اليدوي: سوبر أدمن أو مدير محل بس، مع سبب. القواعد: التسويق ← برنامج النقاط.",
                          }}
                        />
                      </p>
                      {!loyalty.enabled && <p className="text-xs text-muted-foreground">البرنامج موقّف حالياً — ما في ربح ولا تحويل.</p>}
                      {canRedeem && loyalty.enabled && c.points_balance >= loyalty.reward_points && (
                        <Button size="sm" variant="outline" disabled={ptsBusy} onClick={() => void redeemFor(c)}>
                          حوّل لرصيد بالمحفظة
                        </Button>
                      )}
                      {pts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ما في حركات نقاط.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {pts.map((m) => (
                            <li key={m.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs">
                                {PTS_KIND_AR[m.kind] ?? m.kind}
                                <span className="block text-muted-foreground">{day(m.created_at)}</span>
                              </span>
                              <span className="truncate text-xs text-muted-foreground" dir="auto">{m.note}</span>
                              <span className={`font-mono text-xs ${m.delta > 0 ? "text-green-600 dark:text-green-400" : ""}`} dir="ltr">
                                {m.delta > 0 ? "+" : ""}{m.delta}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {canAdjust && (
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-xs font-medium">تعديل يدوي للنقاط</p>
                          <div className="flex flex-wrap gap-2">
                            <Input
                              value={adjDelta}
                              onChange={(e) => setAdjDelta(e.target.value)}
                              placeholder="+50 / -50"
                              aria-label="عدد النقاط (+ أو -)"
                              dir="ltr"
                              inputMode="numeric"
                              className="h-9 w-28 text-left font-mono"
                            />
                            <Input
                              value={adjNote}
                              onChange={(e) => setAdjNote(e.target.value)}
                              placeholder="السبب (إجباري)"
                              aria-label="سبب التعديل"
                              className="h-9 min-w-40 flex-1"
                            />
                            <Button size="sm" disabled={ptsBusy || !adjDelta.trim() || !adjNote.trim()} onClick={() => void adjust(c)}>
                              سجّل
                            </Button>
                          </div>
                        </div>
                      )}
                      {ptsMsg && (
                        <p className={`text-xs ${ptsMsg.bad ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{ptsMsg.text}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
          );
        })}
      </section>
    </div>
  );
}
