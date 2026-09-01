import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";

import { PrintButton } from "./print-button";

interface DashOrder {
  id: string;
  channel: string;
  status: string;
  created_at: string;
  subtotal_usd_cents: number;
  discount_usd_cents: number;
  total_usd_cents: number;
  order_items: Array<{
    quantity: number;
    line_total_usd_cents: number;
    name_en: string;
    product_variants: {
      products: { cost_usd_cents: number | null; categories: { name_ar: string } | null } | null;
    } | null;
  }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function lbp(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} ل.ل`;
}

export async function Dashboard({ name, days }: { name: string; days: number }) {
  const supabase = await supabaseServer();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const [ordersQ, paysQ, returnsQ, custNewQ, custTotalQ, lowStockQ, rateQ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, channel, status, created_at, subtotal_usd_cents, discount_usd_cents, total_usd_cents, order_items(quantity, line_total_usd_cents, name_en, product_variants(products(cost_usd_cents, categories(name_ar))))",
      )
      .gte("created_at", from.toISOString())
      .not("status", "in", '("cancelled")'),
    supabase
      .from("order_payments")
      .select("currency, method, amount_minor, orders!inner(created_at, status)")
      .gte("orders.created_at", from.toISOString()),
    supabase
      .from("order_returns")
      .select("credit_usd_cents, kind")
      .gte("created_at", from.toISOString()),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("inventory_levels")
      .select("quantity, reserved, reorder_threshold, product_variants(sku, products(name_en))")
      .gt("reorder_threshold", 0)
      .order("quantity", { ascending: true })
      .limit(200),
    supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const orders = (ordersQ.data ?? []) as unknown as DashOrder[];
  const rate = rateQ.data ? Number(rateQ.data.lbp_per_usd) : 0;

  // KPIs
  const revenue = orders.reduce((s, o) => s + o.total_usd_cents, 0);
  const discounts = orders.reduce((s, o) => s + o.discount_usd_cents, 0);
  const orderCount = orders.length;
  const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
  const posRevenue = orders.filter((o) => o.channel === "pos").reduce((s, o) => s + o.total_usd_cents, 0);
  const onlineRevenue = revenue - posRevenue;

  let cogs = 0;
  let cogsKnown = true;
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  const byCategory = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.order_items) {
      const cost = i.product_variants?.products?.cost_usd_cents;
      if (cost == null) cogsKnown = false;
      else cogs += cost * i.quantity;
      const p = byProduct.get(i.name_en) ?? { qty: 0, revenue: 0 };
      p.qty += i.quantity;
      p.revenue += i.line_total_usd_cents;
      byProduct.set(i.name_en, p);
      const cat = i.product_variants?.products?.categories?.name_ar ?? "غير مصنّف";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + i.line_total_usd_cents);
    }
  }
  const margin = revenue - cogs;

  let cashUsd = 0;
  let cashLbp = 0;
  for (const p of paysQ.data ?? []) {
    if (p.method !== "cash") continue;
    if (p.currency === "USD") cashUsd += Number(p.amount_minor);
    else cashLbp += Number(p.amount_minor);
  }

  const returns = returnsQ.data ?? [];
  const returnsValue = returns.reduce((s, r) => s + r.credit_usd_cents, 0);

  const lowStock = ((lowStockQ.data ?? []) as unknown as Array<{
    quantity: number;
    reserved: number;
    reorder_threshold: number;
    product_variants: { sku: string | null; products: { name_en: string } | null } | null;
  }>).filter((l) => l.quantity - l.reserved <= l.reorder_threshold);

  // Daily series (last `days`, capped at 14 bars for readability)
  const barDays = Math.min(days, 14);
  const series: Array<{ label: string; value: number }> = [];
  for (let d = barDays - 1; d >= 0; d--) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    const key = day.toISOString().slice(0, 10);
    const value = orders
      .filter((o) => o.created_at.slice(0, 10) === key)
      .reduce((s, o) => s + o.total_usd_cents, 0);
    series.push({ label: key.slice(8), value });
  }
  const maxDay = Math.max(...series.map((s) => s.value), 1);

  const topProducts = [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 py-8 print:max-w-none print:space-y-4 print:p-0">
      {/* Branded header — screen + print */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <p className="hidden text-lg font-bold tracking-[0.3em] print:block">BACH WEARS</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            مرحبا {name || "بشار"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            لوحة القيادة — آخر {days} يوم · سعر الصرف {rate.toLocaleString("en-US")} ل.ل/$
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/?days=${d}`}
              className={`rounded-full border px-3 py-1 text-sm ${days === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {d} يوم
            </Link>
          ))}
          <PrintButton label="طباعة التقرير" />
        </div>
        <p className="hidden text-xs text-muted-foreground print:block" dir="ltr">
          Printed {new Date().toLocaleString("en-GB")}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Kpi label="المبيعات" value={usd(revenue)} sub={rate ? lbp((revenue / 100) * rate) : undefined} />
        <Kpi label="عدد الطلبات" value={String(orderCount)} sub={`متوسط الطلب ${usd(avgOrder)}`} />
        <Kpi
          label="هامش الربح"
          value={usd(margin)}
          sub={cogsKnown ? `كلفة البضاعة ${usd(cogs)}` : `كلفة ناقصة لبعض القطع — التقدير ${usd(cogs)}`}
          tone={margin >= 0 ? "good" : "bad"}
        />
        <Kpi label="المرتجعات" value={usd(returnsValue)} sub={`${returns.length} عملية`} tone={returnsValue > 0 ? "bad" : undefined} />
        <Kpi label="مبيعات المحل" value={usd(posRevenue)} sub={revenue ? `${Math.round((posRevenue / revenue) * 100)}%` : "—"} />
        <Kpi label="مبيعات الأونلاين" value={usd(onlineRevenue)} sub={revenue ? `${Math.round((onlineRevenue / revenue) * 100)}%` : "—"} />
        <Kpi label="كاش مقبوض" value={usd(cashUsd)} sub={lbp(cashLbp)} />
        <Kpi label="الزبائن" value={String(custTotalQ.count ?? 0)} sub={`${custNewQ.count ?? 0} جديد بالفترة`} />
      </div>

      {/* Daily revenue bars */}
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">المبيعات اليومية</h2>
        <div className="mt-4 flex h-32 items-end gap-1.5" dir="ltr">
          {series.map((s, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{s.value > 0 ? `$${Math.round(s.value / 100)}` : ""}</span>
              <div
                className="w-full rounded-t bg-foreground/80 print:bg-black"
                style={{ height: `${Math.max((s.value / maxDay) * 100, s.value > 0 ? 4 : 1)}%` }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        {/* Top products */}
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">الأكثر مبيعاً</h2>
          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">ما في مبيعات بالفترة.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {topProducts.map(([nameEn, p]) => (
                  <tr key={nameEn} className="border-b last:border-0">
                    <td className="py-2">{nameEn}</td>
                    <td className="py-2 text-center font-mono text-muted-foreground">×{p.qty}</td>
                    <td className="py-2 text-left font-mono">{usd(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* By category */}
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">حسب الفئة</h2>
          {topCategories.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">ما في مبيعات بالفترة.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {topCategories.map(([cat, value]) => (
                <div key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0">{cat}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-foreground/80 print:bg-black"
                      style={{ width: `${(value / (topCategories[0]?.[1] ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-left font-mono">{usd(value)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Low stock */}
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          مخزون تحت الحد ({lowStock.length})
        </h2>
        {lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">كل المخزون فوق الحدود المطلوبة. 🖤</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-right text-muted-foreground">
                <th className="py-2 font-normal">القطعة</th>
                <th className="py-2 font-normal">SKU</th>
                <th className="py-2 font-normal">متاح</th>
                <th className="py-2 font-normal">الحد</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 15).map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">{l.product_variants?.products?.name_en}</td>
                  <td className="py-2 font-mono text-xs" dir="ltr">{l.product_variants?.sku}</td>
                  <td className="py-2 font-mono">{l.quantity - l.reserved}</td>
                  <td className="py-2 font-mono text-muted-foreground">{l.reorder_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lowStock.length > 15 && (
          <p className="mt-2 text-xs text-muted-foreground">و{lowStock.length - 15} كمان — شوفهن بالمخزون.</p>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-semibold ${
          tone === "bad" ? "text-destructive" : tone === "good" ? "text-green-600 dark:text-green-400" : ""
        } print:text-black`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
