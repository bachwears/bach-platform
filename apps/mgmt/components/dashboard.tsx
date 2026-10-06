import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Icon } from "@bach/ui/components/icon";
import { PageHeader } from "@bach/ui/components/page-header";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor } from "@bach/ui/lib/photos";

import { PrintButton } from "./print-button";
import { fetchAllPages } from "../lib/fetch-all";
import { addDays, beirutDayStart, beirutYmd, fmt } from "../lib/time";

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
    color_en: string | null;
    product_variants: {
      product_id: string;
      products: { cost_usd_cents: number | null; categories: { name_ar: string } | null } | null;
    } | null;
  }>;
}

interface DashReturn {
  credit_usd_cents: number;
  created_at: string;
  orders: { channel: string } | null;
  order_return_items: Array<{
    quantity: number;
    credit_usd_cents: number;
    order_items: { name_en: string } | null;
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
  // the window starts at Beirut midnight, not the server's (UTC)
  const from = beirutDayStart(days);

  const [ordersQ, paysQ, returnsQ, custNewQ, custTotalQ, lowStockQ, rateQ, courierQ, photos] = await Promise.all([
    // paged: PostgREST max_rows would otherwise cap long windows at 1000 rows
    fetchAllPages((a, b) =>
      supabase
        .from("orders")
        .select(
          "id, channel, status, created_at, subtotal_usd_cents, discount_usd_cents, total_usd_cents, order_items(quantity, line_total_usd_cents, name_en, color_en, product_variants(product_id, products(cost_usd_cents, categories(name_ar))))",
        )
        .gte("created_at", from.toISOString())
        .not("status", "in", '("cancelled")')
        .order("id")
        .range(a, b),
    ),
    fetchAllPages((a, b) =>
      supabase
        .from("order_payments")
        .select("currency, method, amount_minor, orders!inner(created_at, status)")
        .gte("orders.created_at", from.toISOString())
        .order("id")
        .range(a, b),
    ),
    fetchAllPages((a, b) =>
      supabase
        .from("order_returns")
        .select(
          "credit_usd_cents, created_at, orders!order_returns_order_id_fkey(channel), order_return_items(quantity, credit_usd_cents, order_items(name_en), product_variants(products(cost_usd_cents, categories(name_ar))))",
        )
        .gte("created_at", from.toISOString())
        .order("id")
        .range(a, b),
    ),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    // every stock row (≈1,200): a threshold of 0 means "tell me when it sells out",
    // and PostgREST can't compare two columns, so the at-or-below filter runs below
    fetchAllPages((from, to) =>
      supabase
        .from("inventory_levels")
        .select("quantity, reserved, reorder_threshold, product_variants(sku, product_id, color_en, products(name_en, status))")
        .order("quantity", { ascending: true })
        .order("variant_id")
        .range(from, to),
    ),
    supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
    // delivered cash-on-delivery money still with the courier (not in the shop yet)
    supabase
      .from("orders")
      .select("total_usd_cents")
      .eq("channel", "online")
      .eq("payment_method", "cod")
      .eq("fulfilment", "delivery")
      .in("status", ["delivered", "completed", "returned", "exchanged"])
      .is("cod_settled_at", null)
      .limit(1000),
    // same query API as the browser client; the helper is typed for that one
    loadFrontPhotos(supabase as unknown as Parameters<typeof loadFrontPhotos>[0]),
  ]);

  const orders = (ordersQ.data ?? []) as unknown as DashOrder[];
  const rate = rateQ.data ? Number(rateQ.data.lbp_per_usd) : 0;

  const returns = (returnsQ.data ?? []) as unknown as DashReturn[];
  const returnsValue = returns.reduce((s, r) => s + r.credit_usd_cents, 0);

  // KPIs — net of returns: a return's credit comes off sales on the day it was
  // returned, and the returned pieces' cost comes off the cost of goods (they
  // are back on the shelf). An exchange's new pieces are a new sale.
  const gross = orders.reduce((s, o) => s + o.total_usd_cents, 0);
  const revenue = gross - returnsValue;
  const discounts = orders.reduce((s, o) => s + o.discount_usd_cents, 0);
  // fully returned orders aren't sales any more
  const orderCount = orders.filter((o) => o.status !== "returned").length;
  const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
  const returnedOn = (channel: string) =>
    returns.filter((r) => r.orders?.channel === channel).reduce((s, r) => s + r.credit_usd_cents, 0);
  const posRevenue = orders.filter((o) => o.channel === "pos").reduce((s, o) => s + o.total_usd_cents, 0) - returnedOn("pos");
  const onlineRevenue = revenue - posRevenue;

  let cogs = 0;
  let cogsKnown = true;
  const byProduct = new Map<string, { qty: number; revenue: number; photo: string | null }>();
  const byCategory = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.order_items) {
      const cost = i.product_variants?.products?.cost_usd_cents;
      if (cost == null) cogsKnown = false;
      else cogs += cost * i.quantity;
      const p = byProduct.get(i.name_en) ?? { qty: 0, revenue: 0, photo: null };
      p.photo ??= photoFor(photos, i.product_variants?.product_id, i.color_en);
      p.qty += i.quantity;
      p.revenue += i.line_total_usd_cents;
      byProduct.set(i.name_en, p);
      const cat = i.product_variants?.products?.categories?.name_ar ?? "غير مصنّف";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + i.line_total_usd_cents);
    }
  }
  for (const r of returns) {
    for (const i of r.order_return_items) {
      const cost = i.product_variants?.products?.cost_usd_cents;
      if (cost != null) cogs -= cost * i.quantity;
      const name = i.order_items?.name_en;
      if (name) {
        const p = byProduct.get(name) ?? { qty: 0, revenue: 0, photo: null };
        p.qty -= i.quantity;
        p.revenue -= i.credit_usd_cents;
        byProduct.set(name, p);
      }
      const cat = i.product_variants?.products?.categories?.name_ar ?? "غير مصنّف";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) - i.credit_usd_cents);
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


  const lowStock = ((lowStockQ.data ?? []) as unknown as Array<{
    quantity: number;
    reserved: number;
    reorder_threshold: number;
    product_variants: {
      sku: string | null;
      product_id: string;
      color_en: string | null;
      products: { name_en: string; status?: string } | null;
    } | null;
  }>)
    .filter((l) => l.quantity - l.reserved <= l.reorder_threshold)
    .slice(0, 200);

  // Daily series (last `days`, capped at 14 bars for readability)
  const barDays = Math.min(days, 14);
  const series: Array<{ label: string; value: number }> = [];
  for (let d = barDays - 1; d >= 0; d--) {
    const key = addDays(beirutYmd(), -d);
    const value =
      orders.filter((o) => beirutYmd(o.created_at) === key).reduce((s, o) => s + o.total_usd_cents, 0) -
      returns.filter((r) => beirutYmd(r.created_at) === key).reduce((s, r) => s + r.credit_usd_cents, 0);
    series.push({ label: key.slice(8), value });
  }
  const maxDay = Math.max(...series.map((s) => Math.max(s.value, 0)), 1);

  const topProducts = [...byProduct.entries()]
    .filter(([, p]) => p.qty > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6);
  const topCategories = [...byCategory.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 py-8 print:max-w-none print:space-y-4 print:p-0">
      {/* Branded header for print; the screen gets the standard PageHeader */}
      <div className="hidden border-b pb-4 print:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-bach.png" alt="BACH" className="mb-2 h-5 w-auto" />
        <h1 className="text-2xl font-normal">لوحة القيادة — آخر {days} يوم</h1>
        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
          Printed {fmt(new Date())}
        </p>
      </div>
      <PageHeader
        icon="home"
        title={`مرحبا ${name || "بشار"}`}
        description={`لوحة القيادة — كيف ماشي الشغل آخر ${days} يوم: المبيعات، الربح، المرتجعات والمخزون الناقص. سعر الصرف ${rate.toLocaleString("en-US")} ل.ل/$`}
        hint={{
          title: "لوحة القيادة",
          what: "أرقام المحل والأونلاين للفترة يلي اخترتها، صافي من المرتجعات (المرتجع بينطرح بيومو).",
          source: "الطلبات، الدفعات والمرتجعات المسجّلة بالكاشير والموقع؛ الكلفة من بطاقة كل منتج.",
          edit: "ما في شي ينعدّل هون — غيّر الفترة من الأزرار، أو اطبع التقرير.",
        }}
        actions={
          <>
            <div role="group" aria-label="الفترة" className="flex">
              {[7, 30, 90].map((d) => (
                <Link
                  key={d}
                  href={`/?days=${d}`}
                  aria-current={days === d ? "page" : undefined}
                  className={`-ms-px border px-3 py-1.5 text-sm first:ms-0 ${days === d ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d} يوم
                </Link>
              ))}
            </div>
            <PrintButton label="اطبع التقرير" />
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Kpi
          label="المبيعات (صافي)"
          value={usd(revenue)}
          sub={returnsValue ? `${usd(gross)} − مرتجع ${usd(returnsValue)}` : rate ? lbp((revenue / 100) * rate) : undefined}
        />
        <Kpi label="عدد الطلبات" value={String(orderCount)} sub={`متوسط الطلب ${usd(avgOrder)}`} />
        <Kpi
          label="هامش الربح"
          value={usd(margin)}
          sub={cogsKnown ? `كلفة البضاعة ${usd(cogs)}` : `كلفة ناقصة لبعض القطع — التقدير ${usd(cogs)}`}
          tone={margin >= 0 ? "good" : "bad"}
        />
        <Kpi
          label="المرتجعات"
          value={usd(returnsValue)}
          sub={returns.length ? `${returns.length} عملية — منطرحة من المبيعات والربح` : "ولا عملية"}
          tone={returnsValue > 0 ? "bad" : undefined}
        />
        <Kpi label="مبيعات المحل" value={usd(posRevenue)} sub={revenue ? `${Math.round((posRevenue / revenue) * 100)}%` : "—"} />
        <Kpi label="مبيعات الأونلاين" value={usd(onlineRevenue)} sub={revenue ? `${Math.round((onlineRevenue / revenue) * 100)}%` : "—"} />
        <Kpi
          label="كاش مقبوض"
          value={usd(cashUsd)}
          sub={`${lbp(cashLbp)} · عند شركة الشحن ${usd((courierQ.data ?? []).reduce((s, o) => s + o.total_usd_cents, 0))}`}
        />
        <Kpi label="الزبائن" value={String(custTotalQ.count ?? 0)} sub={`${custNewQ.count ?? 0} جديد بالفترة`} />
      </div>

      {/* Daily revenue bars */}
      <section className="border p-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">المبيعات اليومية</h2>
        <div className="mt-4 flex h-32 items-end gap-1.5" dir="ltr">
          {series.map((s, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{s.value > 0 ? `$${Math.round(s.value / 100)}` : ""}</span>
              <div
                className="w-full bg-foreground/80 print:bg-black"
                style={{ height: `${Math.max((s.value / maxDay) * 100, s.value > 0 ? 4 : 1)}%` }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        {/* Top products */}
        <section className="border p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">الأكثر مبيعاً</h2>
          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">ما في مبيعات بهالفترة — جرّب فترة أطول من فوق.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {topProducts.map(([nameEn, p]) => (
                  <tr key={nameEn} className="border-b last:border-0">
                    <td className="py-2">
                      <span className="flex items-center gap-3">
                        <Thumb src={p.photo} size="sm" />
                        <span className="min-w-0">{nameEn}</span>
                      </span>
                    </td>
                    <td className="py-2 text-center font-mono text-muted-foreground">×{p.qty}</td>
                    <td className="py-2 text-end font-mono">{usd(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* By category */}
        <section className="border p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">حسب الفئة</h2>
          {topCategories.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">ما في مبيعات بهالفترة — جرّب فترة أطول من فوق.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {topCategories.map(([cat, value]) => (
                <div key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0">{cat}</span>
                  <div className="h-2 flex-1 overflow-hidden bg-muted">
                    <div
                      className="h-full bg-foreground/80 print:bg-black"
                      style={{ width: `${(value / (topCategories[0]?.[1] ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-end font-mono">{usd(value)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Low stock */}
      <section className="border p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Icon name="lowStock" size={16} />
          مخزون تحت الحد ({lowStock.length})
        </h2>
        {lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">كل المخزون فوق الحدود المطلوبة.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 text-start font-normal">القطعة</th>
                <th className="py-2 text-start font-normal">SKU</th>
                <th className="py-2 text-start font-normal">متاح</th>
                <th className="py-2 text-start font-normal">الحد</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 15).map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">
                    <span className="flex items-center gap-3">
                      <Thumb src={photoFor(photos, l.product_variants?.product_id, l.product_variants?.color_en)} size="sm" />
                      <span className="min-w-0">{l.product_variants?.products?.name_en}</span>
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs" dir="ltr">{l.product_variants?.sku}</td>
                  <td className="py-2 font-mono">{l.quantity - l.reserved}</td>
                  <td className="py-2 font-mono text-muted-foreground">{l.reorder_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {lowStock.length > 15 && (
          <p className="mt-2 text-xs text-muted-foreground">
            و{lowStock.length - 15} كمان —{" "}
            <Link href="/inventory" className="underline underline-offset-4 hover:text-foreground print:no-underline">
              شوفهن بالمخزون
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="border p-4">
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
