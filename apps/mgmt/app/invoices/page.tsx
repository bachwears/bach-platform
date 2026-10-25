import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { InvoiceHistory, type InvoiceRow } from "../../components/invoice-history";
import { fetchAllPages } from "../../lib/fetch-all";
import { addDays, beirutMidnightOf, beirutYmd } from "../../lib/time";

const PERIODS = [
  ["today", "اليوم"],
  ["week", "هالأسبوع"],
  ["month", "هالشهر"],
  ["all", "كل الفواتير"],
] as const;
const CHANNELS = [
  ["", "الكل"],
  ["pos", "المحل"],
  ["online", "أونلاين"],
] as const;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** The period's Beirut dates, inclusive: [from, to] (null = from the first invoice). */
function range(period: string, from?: string, to?: string): { from: string | null; to: string } {
  const today = beirutYmd();
  if (period === "range" && from && YMD.test(from)) return { from, to: to && YMD.test(to) && to >= from ? to : today };
  if (period === "today") return { from: today, to: today };
  if (period === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (period === "all") return { from: null, to: today };
  // the week starts on Monday
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  return { from: addDays(today, -((weekday + 6) % 7)), to: today };
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period === "range" || PERIODS.some(([k]) => k === sp.period) ? sp.period! : "week";
  const channel = sp.channel === "pos" || sp.channel === "online" ? sp.channel : "";
  const { from, to } = range(period, sp.from, sp.to);
  const supabase = await supabaseServer();

  const { data: rows, error } = await fetchAllPages<InvoiceRow>((a, b) => {
    let q = supabase
      .from("orders")
      .select(
        "id, number, invoice_number, invoiced_at, channel, status, fulfilment, payment_method, subtotal_usd_cents, discount_usd_cents, delivery_usd_cents, tva_usd_cents, total_usd_cents, ship_name, ship_phone, customers(full_name, phone), branches(name), profiles!orders_cashier_id_fkey(full_name), order_returns!order_returns_order_id_fkey(kind, credit_usd_cents)",
      )
      .not("invoice_number", "is", null)
      .lt("invoiced_at", beirutMidnightOf(addDays(to, 1)).toISOString());
    if (from) q = q.gte("invoiced_at", beirutMidnightOf(from).toISOString());
    if (channel) q = q.eq("channel", channel);
    return q.order("invoice_number", { ascending: false }).range(a, b) as never;
  });

  // Is the whole series unbroken? (one cheap look at the counter's range)
  const [{ data: firstInv }, { data: lastInv }, { count }] = await Promise.all([
    supabase.from("orders").select("invoice_number").not("invoice_number", "is", null).order("invoice_number").limit(1).maybeSingle(),
    supabase.from("orders").select("invoice_number").not("invoice_number", "is", null).order("invoice_number", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).not("invoice_number", "is", null),
  ]);
  const series = {
    first: firstInv?.invoice_number ?? null,
    last: lastInv?.invoice_number ?? null,
    unbroken: firstInv?.invoice_number === 1 && lastInv?.invoice_number === (count ?? -1),
  };

  const link = (p: Record<string, string>) => {
    const u = new URLSearchParams({ period, ...(channel ? { channel } : {}), ...(period === "range" && from ? { from, to } : {}), ...p });
    for (const [k, v] of [...u]) if (!v) u.delete(k);
    return `/invoices?${u}`;
  };
  const tab = (active: boolean) =>
    `-mb-px border-b pb-2 ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="min-h-dvh bg-background">
      <div className="print:hidden">
        <Nav />
      </div>
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <PageHeader
            icon="invoices"
            title="الفواتير"
            description="سجلّ كل الفواتير، المحل والأونلاين، بالتسلسل — تصفّح، دوّر، اطبع أو صدّر."
            hint={{
              title: "سجلّ الفواتير",
              what: "كل بيعة (بالمحل أو أونلاين) إلها رقم فاتورة متسلسل بلا فجوات: 000001، 000002… الفاتورة الملغاة بتضل بالسجلّ ومكتوب عليها «ملغاة» — ولا فاتورة بتنمسح.",
              source: "رقم الفاتورة بينعطى أوتوماتيك لحظة ما ينسجّل الطلب. رقم الطلب (#) بيضل للتتبّع مع الزبون.",
              edit: "الفاتورة ما بتتعدّل. الإلغاء من صفحة الطلب، والإرجاع من الكاشير.",
            }}
          />
        </div>

        <div className="space-y-4 print:hidden">
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b text-sm" aria-label="الفترة">
            {PERIODS.map(([k, label]) => (
              <Link key={k} href={link({ period: k, from: "", to: "" })} aria-current={period === k ? "page" : undefined} className={tab(period === k)}>
                {label}
              </Link>
            ))}
            <span className={tab(period === "range")}>من تاريخ لتاريخ</span>
          </div>
          <form action="/invoices" className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="period" value="range" />
            {channel ? <input type="hidden" name="channel" value={channel} /> : null}
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">من</span>
              <input type="date" name="from" defaultValue={from ?? ""} required className="h-10 border bg-background px-3" dir="ltr" />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">لـ</span>
              <input type="date" name="to" defaultValue={to} className="h-10 border bg-background px-3" dir="ltr" />
            </label>
            <button type="submit" className="h-10 border px-4 hover:bg-muted">
              اعرض
            </button>
            <span className="ms-auto flex gap-4" aria-label="القناة">
              {CHANNELS.map(([k, label]) => (
                <Link key={k} href={link({ channel: k })} aria-current={channel === k ? "page" : undefined} className={tab(channel === k)}>
                  {label}
                </Link>
              ))}
            </span>
          </form>
        </div>

        {error ? (
          <p className="text-sm text-destructive">ما قدرنا نجيب الفواتير: {error.message}</p>
        ) : (
          <InvoiceHistory rows={rows} from={from} to={to} channel={channel} series={series} />
        )}
      </main>
    </div>
  );
}
