"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const bom = "\uFEFF"; // Arabic-safe in Excel
  const body = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function usdNum(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function Reports() {
  const supabase = supabaseBrowser();
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const range = () => ({
    fromIso: new Date(`${from}T00:00:00`).toISOString(),
    toIso: new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 3600 * 1000).toISOString(),
  });

  async function run(key: string, fn: () => Promise<number>) {
    setBusy(key);
    setError("");
    setDone("");
    try {
      const n = await fn();
      setDone(`${key}: انصدّر ${n} سطر.`);
    } catch (e) {
      setError(`ما مشي التصدير: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy("");
  }

  async function exportOrders(): Promise<number> {
    const { fromIso, toIso } = range();
    const { data, error: err } = await supabase
      .from("orders")
      .select("number, created_at, channel, status, payment_method, ship_name, ship_phone, ship_city, subtotal_usd_cents, discount_usd_cents, tva_usd_cents, total_usd_cents, lbp_per_usd, customers(full_name, phone)")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at");
    if (err) throw new Error(err.message);
    const rows = (data ?? []).map((o) => {
      const cust = o.customers as unknown as { full_name: string | null; phone: string | null } | null;
      return [
        o.number,
        o.created_at.slice(0, 16).replace("T", " "),
        o.channel,
        o.status,
        o.payment_method,
        cust?.full_name ?? o.ship_name ?? "",
        cust?.phone ?? o.ship_phone ?? "",
        o.ship_city ?? "",
        usdNum(o.subtotal_usd_cents),
        usdNum(o.discount_usd_cents),
        usdNum(o.tva_usd_cents),
        usdNum(o.total_usd_cents),
        Number(o.lbp_per_usd),
        Math.round((o.total_usd_cents / 100) * Number(o.lbp_per_usd)),
      ];
    });
    downloadCsv(`bach-orders-${from}-to-${to}.csv`,
      ["Order", "Date", "Channel", "Status", "Payment", "Customer", "Phone", "City", "Subtotal USD", "Discount USD", "TVA USD", "Total USD", "Rate", "Total LBP"],
      rows);
    return rows.length;
  }

  async function exportItems(): Promise<number> {
    const { fromIso, toIso } = range();
    const { data, error: err } = await supabase
      .from("order_items")
      .select("sku, name_en, size, color_en, quantity, unit_price_usd_cents, line_total_usd_cents, orders!inner(number, created_at, channel, status)")
      .gte("orders.created_at", fromIso)
      .lt("orders.created_at", toIso);
    if (err) throw new Error(err.message);
    const rows = (data ?? []).map((i) => {
      const o = i.orders as unknown as { number: number; created_at: string; channel: string; status: string };
      return [o.number, o.created_at.slice(0, 10), o.channel, o.status, i.sku ?? "", i.name_en, i.size, i.color_en, i.quantity, usdNum(i.unit_price_usd_cents), usdNum(i.line_total_usd_cents)];
    });
    downloadCsv(`bach-order-items-${from}-to-${to}.csv`,
      ["Order", "Date", "Channel", "Status", "SKU", "Product", "Size", "Color", "Qty", "Unit USD", "Line USD"],
      rows);
    return rows.length;
  }

  async function exportDailyJournal(): Promise<number> {
    const { fromIso, toIso } = range();
    const [{ data: orders, error: e1 }, { data: pays, error: e2 }, { data: rets, error: e3 }] = await Promise.all([
      supabase.from("orders").select("created_at, channel, status, subtotal_usd_cents, discount_usd_cents, tva_usd_cents, total_usd_cents").gte("created_at", fromIso).lt("created_at", toIso).neq("status", "cancelled"),
      supabase.from("order_payments").select("currency, method, amount_minor, created_at").gte("created_at", fromIso).lt("created_at", toIso),
      supabase.from("order_returns").select("created_at, credit_usd_cents, order_return_payments(direction, currency, amount_minor)").gte("created_at", fromIso).lt("created_at", toIso),
    ]);
    if (e1 || e2 || e3) throw new Error((e1 ?? e2 ?? e3)!.message);
    const days = new Map<string, { orders: number; gross: number; disc: number; tva: number; total: number; cashUsd: number; cashLbp: number; outUsd: number; outLbp: number }>();
    const day = (iso: string) => iso.slice(0, 10);
    const get = (k: string) => {
      if (!days.has(k)) days.set(k, { orders: 0, gross: 0, disc: 0, tva: 0, total: 0, cashUsd: 0, cashLbp: 0, outUsd: 0, outLbp: 0 });
      return days.get(k)!;
    };
    for (const o of orders ?? []) {
      const d = get(day(o.created_at));
      d.orders++;
      d.gross += o.subtotal_usd_cents;
      d.disc += o.discount_usd_cents;
      d.tva += o.tva_usd_cents;
      d.total += o.total_usd_cents;
    }
    for (const p of pays ?? []) {
      if (p.method !== "cash") continue;
      const d = get(day(p.created_at));
      if (p.currency === "USD") d.cashUsd += Number(p.amount_minor);
      else d.cashLbp += Number(p.amount_minor);
    }
    for (const r of rets ?? []) {
      const d = get(day(r.created_at));
      for (const p of (r.order_return_payments ?? []) as Array<{ direction: string; currency: string; amount_minor: number }>) {
        if (p.direction !== "out") continue;
        if (p.currency === "USD") d.outUsd += Number(p.amount_minor);
        else d.outLbp += Number(p.amount_minor);
      }
    }
    const rows = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, d]) => [
      k, d.orders, usdNum(d.gross), usdNum(d.disc), usdNum(d.tva), usdNum(d.total),
      usdNum(d.cashUsd), d.cashLbp, usdNum(d.outUsd), d.outLbp,
      usdNum(d.cashUsd - d.outUsd), d.cashLbp - d.outLbp,
    ]);
    downloadCsv(`bach-daily-journal-${from}-to-${to}.csv`,
      ["Date", "Orders", "Gross USD", "Discounts USD", "TVA USD", "Net Sales USD", "Cash In USD", "Cash In LBP", "Refunds Out USD", "Refunds Out LBP", "Net Cash USD", "Net Cash LBP"],
      rows);
    return rows.length;
  }

  async function exportInventory(): Promise<number> {
    const { data, error: err } = await supabase
      .from("product_variants")
      .select("sku, barcode, size, color_en, is_active, products!inner(name_en, name_ar, status, price_usd_cents, sale_price_usd_cents, cost_usd_cents, categories(name_en)), inventory_levels(quantity, reserved, reorder_threshold)")
      .order("sku");
    if (err) throw new Error(err.message);
    const rows = (data ?? []).map((v) => {
      const p = v.products as unknown as { name_en: string; name_ar: string; status: string; price_usd_cents: number; sale_price_usd_cents: number | null; cost_usd_cents: number | null; categories: { name_en: string } | null };
      const lvl = (v.inventory_levels as Array<{ quantity: number; reserved: number; reorder_threshold: number }>)[0];
      return [
        v.sku ?? "", v.barcode ?? "", p.name_en, p.name_ar, p.categories?.name_en ?? "", v.size, v.color_en,
        p.status, v.is_active ? "yes" : "no",
        lvl?.quantity ?? 0, lvl?.reserved ?? 0, lvl?.reorder_threshold ?? 0,
        usdNum(p.cost_usd_cents), usdNum(p.price_usd_cents), p.sale_price_usd_cents != null ? usdNum(p.sale_price_usd_cents) : "",
      ];
    });
    downloadCsv(`bach-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      ["SKU", "Barcode", "Product EN", "Product AR", "Category", "Size", "Color", "Status", "Active", "Stock", "Reserved", "Min Qty", "Cost USD", "Price USD", "Sale USD"],
      rows);
    return rows.length;
  }

  async function exportCustomers(): Promise<number> {
    const { data, error: err } = await supabase
      .from("customers")
      .select("full_name, phone, email, birthday, marketing_consent, created_at, orders(total_usd_cents, status)")
      .order("created_at");
    if (err) throw new Error(err.message);
    const rows = (data ?? []).map((c) => {
      const orders = (c.orders as Array<{ total_usd_cents: number; status: string }>) ?? [];
      const valid = orders.filter((o) => o.status !== "cancelled");
      return [
        c.full_name ?? "", c.phone ?? "", c.email ?? "", c.birthday ?? "",
        c.marketing_consent ? "yes" : "no", c.created_at.slice(0, 10),
        valid.length, usdNum(valid.reduce((s, o) => s + o.total_usd_cents, 0)),
      ];
    });
    downloadCsv(`bach-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Phone", "Email", "Birthday", "Consent", "Since", "Orders", "Lifetime USD"],
      rows);
    return rows.length;
  }

  async function exportCloseouts(): Promise<number> {
    const { fromIso, toIso } = range();
    const { data, error: err } = await supabase
      .from("eod_closeouts")
      .select("business_date, orders_count, gross_usd_cents, discounts_usd_cents, tva_usd_cents, expected_usd_cents, expected_lbp, counted_usd_cents, counted_lbp, note, profiles(full_name)")
      .gte("business_date", fromIso.slice(0, 10))
      .lte("business_date", toIso.slice(0, 10))
      .order("business_date");
    if (err) throw new Error(err.message);
    const rows = (data ?? []).map((c) => [
      String(c.business_date).slice(0, 10), c.orders_count, usdNum(c.gross_usd_cents), usdNum(c.discounts_usd_cents), usdNum(c.tva_usd_cents),
      usdNum(Number(c.expected_usd_cents)), Number(c.expected_lbp),
      usdNum(Number(c.counted_usd_cents)), Number(c.counted_lbp),
      usdNum(Number(c.counted_usd_cents) - Number(c.expected_usd_cents)), Number(c.counted_lbp) - Number(c.expected_lbp),
      (c.profiles as unknown as { full_name: string } | null)?.full_name ?? "", c.note ?? "",
    ]);
    downloadCsv(`bach-eod-${from}-to-${to}.csv`,
      ["Date", "Orders", "Gross USD", "Discounts USD", "TVA USD", "Expected USD", "Expected LBP", "Counted USD", "Counted LBP", "Variance USD", "Variance LBP", "Closed By", "Note"],
      rows);
    return rows.length;
  }

  const REPORTS: Array<{ key: string; title: string; desc: string; ranged: boolean; fn: () => Promise<number> }> = [
    { key: "orders", title: "الطلبات", desc: "كل طلب: القناة، الحالة، الدفع، المبالغ بالدولار والليرة وسعر الصرف.", ranged: true, fn: exportOrders },
    { key: "items", title: "تفاصيل القطع المباعة", desc: "سطر لكل قطعة مباعة — لتحليل أداء المنتجات.", ranged: true, fn: exportItems },
    { key: "journal", title: "اليومية المالية", desc: "يوم بيوم: مبيعات، خصومات، TVA، كاش داخل وخارج بالعملتين (§9).", ranged: true, fn: exportDailyJournal },
    { key: "eod", title: "تسكيرات اليوم", desc: "المتوقع مقابل المعدود مع الفروقات — سجل المطابقة.", ranged: true, fn: exportCloseouts },
    { key: "inventory", title: "المخزون الكامل", desc: "لقطة اليوم: كل SKU مع الكميات والكلفة والأسعار.", ranged: false, fn: exportInventory },
    { key: "customers", title: "الزبائن", desc: "الأسماء، التواصل، الموافقة التسويقية، وقيمة كل زبون.", ranged: false, fn: exportCustomers },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">من</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" dir="ltr" />
        <label className="text-sm text-muted-foreground">إلى</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" dir="ltr" />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      {done && <p className="rounded-md bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">{done}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.key} className="flex flex-col rounded-lg border p-4">
            <p className="font-medium">{r.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.desc}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.ranged ? "حسب الفترة المختارة" : "لقطة كاملة"}</p>
            <Button className="mt-3" size="sm" disabled={busy !== ""} onClick={() => void run(r.title, r.fn)}>
              {busy === r.title ? "عم نجهّز…" : "تنزيل CSV (Excel)"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        الملفات بصيغة CSV بترميز يفتح العربي صح بـExcel مباشرة.
      </p>
    </div>
  );
}
