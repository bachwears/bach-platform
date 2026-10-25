"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@bach/ui/components/empty-state";
import { Icon } from "@bach/ui/components/icon";
import { OrderStatus } from "@bach/ui/components/order-status";
import { invoiceNo } from "@bach/ui/lib/invoice-number";

import { paymentLabel } from "../lib/order-status";
import { beirutStamp, fmt } from "../lib/time";

export interface InvoiceRow {
  id: string;
  number: number;
  invoice_number: number;
  invoiced_at: string;
  channel: string;
  status: string;
  fulfilment: string | null;
  payment_method: string | null;
  subtotal_usd_cents: number;
  discount_usd_cents: number;
  delivery_usd_cents: number | null;
  tva_usd_cents: number;
  total_usd_cents: number;
  ship_name: string | null;
  ship_phone: string | null;
  customers: { full_name: string | null; phone: string | null } | null;
  branches: { name: string } | null;
  profiles: { full_name: string | null } | null;
  /** returns against this invoice (POS returns / exchanges, and «الزبون ما استلم») */
  order_returns: Array<{ kind: string; credit_usd_cents: number }> | null;
}

const CHANNEL: Record<string, string> = { pos: "المحل", online: "أونلاين" };
const STEP = 100;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const isVoid = (r: InvoiceRow) => r.status === "cancelled";
const returnedOf = (r: InvoiceRow) => (r.order_returns ?? []).reduce((s, x) => s + x.credit_usd_cents, 0);
const notReceived = (r: InvoiceRow) => (r.order_returns ?? []).some((x) => x.kind === "not_received");

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The invoice list for one period: search, totals, the series check, CSV and
 * an A4 print of exactly what is on screen.
 */
export function InvoiceHistory({
  rows,
  from,
  to,
  channel,
  series,
}: {
  rows: InvoiceRow[];
  from: string | null;
  to: string;
  channel: string;
  series: { first: number | null; last: number | null; unbroken: boolean };
}) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(STEP);

  const customer = (r: InvoiceRow) => ({
    name: r.ship_name ?? r.customers?.full_name ?? null,
    phone: r.ship_phone ?? r.customers?.phone ?? null,
  });

  const list = useMemo(() => {
    const t = q.trim().replace(/^#/, "").toLowerCase();
    if (!t) return rows;
    const digits = t.replace(/\D/g, "");
    return rows.filter((r) => {
      const c = customer(r);
      return (
        (digits && (String(r.invoice_number) === String(Number(digits)) || String(r.number) === digits)) ||
        (c.name ?? "").toLowerCase().includes(t) ||
        (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
      );
    });
  }, [rows, q]);

  const valid = list.filter((r) => !isVoid(r));
  const totals = {
    count: valid.length,
    // net of returns: a returned invoice (or a delivery the customer never took) counts as nothing
    sales: valid.reduce((s, r) => s + r.total_usd_cents - returnedOf(r), 0),
    returned: valid.reduce((s, r) => s + returnedOf(r), 0),
    discount: valid.reduce((s, r) => s + r.discount_usd_cents, 0),
    voided: list.length - valid.length,
  };
  const label = from ? (from === to ? from : `${from} → ${to}`) : `لحد ${to}`;

  function exportCsv() {
    const headers = ["invoice", "order", "date (Beirut)", "channel", "customer", "phone", "payment", "subtotal", "discount", "delivery", "tva", "total", "returned", "status"];
    const body = list.map((r) => {
      const c = customer(r);
      return [
        invoiceNo(r.invoice_number),
        r.number,
        beirutStamp(r.invoiced_at),
        r.channel,
        c.name ?? "",
        c.phone ?? "",
        r.payment_method ?? "",
        (r.subtotal_usd_cents / 100).toFixed(2),
        (r.discount_usd_cents / 100).toFixed(2),
        ((r.delivery_usd_cents ?? 0) / 100).toFixed(2),
        (r.tva_usd_cents / 100).toFixed(2),
        (r.total_usd_cents / 100).toFixed(2),
        (returnedOf(r) / 100).toFixed(2),
        notReceived(r) ? "returned (not received)" : r.status,
      ];
    });
    const csv = "﻿" + [headers, ...body].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `bach-invoices-${from ?? "start"}-to-${to}${channel ? `-${channel}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      {/* print header (A4) */}
      <div className="hidden print:block">
        <p className="text-lg font-bold tracking-widest">BACH WEARS</p>
        <p className="text-sm">
          سجلّ الفواتير · {label}
          {channel ? ` · ${CHANNEL[channel]}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border p-4">
          <p className="text-sm text-muted-foreground">فواتير سارية</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{totals.count}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{label}</p>
        </div>
        <div className="border p-4">
          <p className="text-sm text-muted-foreground">صافي المبيعات</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{usd(totals.sales)}</p>
          <p className="text-xs text-muted-foreground">
            {totals.returned ? `بعد مرتجعات ${usd(totals.returned)} · بلا الملغاة` : "بلا الفواتير الملغاة"}
          </p>
        </div>
        <div className="border p-4">
          <p className="text-sm text-muted-foreground">الخصومات</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{usd(totals.discount)}</p>
          <p className="text-xs text-muted-foreground">خصم الفاتورة + القطع + الأطقم</p>
        </div>
        <div className="border p-4">
          <p className="text-sm text-muted-foreground">ملغاة</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{totals.voided}</p>
          <p className="text-xs text-muted-foreground">بتضل بالسجلّ، ما بتنحسب</p>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm">
        <Icon name={series.unbroken ? "save" : "info"} size={14} />
        {series.first != null ? (
          <span>
            التسلسل من{" "}
            <span className="font-mono" dir="ltr">
              {invoiceNo(series.first)}
            </span>{" "}
            لـ{" "}
            <span className="font-mono" dir="ltr">
              {invoiceNo(series.last)}
            </span>
            {series.unbroken ? " — كامل، بلا ولا فجوة." : " — في أرقام ناقصة، راجع الإدارة."}
          </span>
        ) : (
          <span>ما في فواتير بعد.</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(STEP);
          }}
          placeholder="دوّر برقم الفاتورة، رقم الطلب، الاسم أو التلفون…"
          aria-label="دوّر بالفواتير"
          className="h-10 min-w-0 flex-1 border bg-background px-3 text-sm sm:max-w-sm"
        />
        <button type="button" onClick={exportCsv} disabled={!list.length} className="flex h-10 items-center gap-2 border px-4 text-sm hover:bg-muted disabled:opacity-50">
          <Icon name="download" size={16} />
          صدّر CSV
        </button>
        <button type="button" onClick={() => window.print()} disabled={!list.length} className="flex h-10 items-center gap-2 border px-4 text-sm hover:bg-muted disabled:opacity-50">
          <Icon name="print" size={16} />
          اطبع
        </button>
      </div>

      <div className="overflow-x-auto border print:overflow-visible">
        {list.length === 0 ? (
          <EmptyState icon="invoices" title={q ? "ما في فاتورة بهالبحث — جرّب رقم الفاتورة أو آخر أرقام التلفون." : "ما في فواتير بهالفترة."} />
        ) : (
          <table className="w-full min-w-[900px] text-sm print:min-w-0 print:text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3 text-start font-normal">الفاتورة</th>
                <th className="p-3 text-start font-normal">التاريخ</th>
                <th className="p-3 text-start font-normal">الطلب</th>
                <th className="p-3 text-start font-normal">القناة</th>
                <th className="p-3 text-start font-normal">الزبون</th>
                <th className="p-3 text-start font-normal">الدفع</th>
                <th className="p-3 text-start font-normal">الخصم</th>
                <th className="p-3 text-start font-normal">الإجمالي</th>
                <th className="p-3 text-start font-normal">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {/* print shows every row; the screen pages through them */}
              {list.map((r, i) => {
                const c = customer(r);
                return (
                  <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/50 ${i >= shown ? "hidden print:table-row" : ""} ${isVoid(r) ? "text-muted-foreground" : ""}`}>
                    <td className="p-3 font-mono">
                      <Link href={`/orders/${r.id}`} className={`underline-offset-2 hover:underline ${isVoid(r) ? "line-through" : ""}`} dir="ltr">
                        {invoiceNo(r.invoice_number)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground" dir="ltr">
                      {fmt(r.invoiced_at, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="p-3 font-mono" dir="ltr">
                      #{r.number}
                    </td>
                    <td className="p-3">
                      {CHANNEL[r.channel] ?? r.channel}
                      {r.channel === "pos" && r.branches?.name ? <span className="block text-xs text-muted-foreground">{r.branches.name}</span> : null}
                    </td>
                    <td className="p-3">
                      {c.name ?? "زبون عابر"}
                      {c.phone ? (
                        <span className="block text-xs text-muted-foreground" dir="ltr">
                          {c.phone}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">{paymentLabel(r.payment_method)}</td>
                    <td className="p-3 font-mono">{r.discount_usd_cents > 0 ? `- ${usd(r.discount_usd_cents)}` : "—"}</td>
                    <td className="p-3 font-mono">{usd(r.total_usd_cents)}</td>
                    <td className="p-3">
                      {isVoid(r) ? (
                        "ملغاة"
                      ) : notReceived(r) ? (
                        r.fulfilment === "pickup" ? "مرتجع — ما إجا يستلم" : "مرتجع — ما استلم"
                      ) : (
                        <OrderStatus status={r.status} fulfilment={r.fulfilment} />
                      )}
                      {returnedOf(r) > 0 ? <span className="block font-mono text-xs text-muted-foreground">- {usd(returnedOf(r))}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {list.length > shown ? (
        <button type="button" onClick={() => setShown((n) => n + STEP)} className="h-10 w-full border text-sm hover:bg-muted print:hidden">
          اعرض {Math.min(STEP, list.length - shown)} كمان ({list.length - shown} باقي)
        </button>
      ) : null}
    </div>
  );
}
