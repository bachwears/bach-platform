import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";

import { Nav } from "../../components/nav";
import { STATUS_LABELS } from "../../lib/order-status";

const CHANNEL_LABELS: Record<string, string> = { pos: "المحل", online: "أونلاين" };

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await supabaseServer();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let query = supabase
    .from("orders")
    .select(
      "id, number, channel, status, total_usd_cents, lbp_per_usd, created_at, branches(name), profiles(full_name), order_items(quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && STATUS_LABELS[status]) query = query.eq("status", status);

  const [{ data: orders }, { data: todayOrders }, { data: todayPays }] = await Promise.all([
    query,
    supabase
      .from("orders")
      .select("total_usd_cents, status")
      .gte("created_at", startOfDay.toISOString())
      .not("status", "in", '("cancelled","returned")'),
    supabase
      .from("order_payments")
      .select("currency, amount_minor, usd_equiv_cents, orders!inner(created_at, status)")
      .gte("orders.created_at", startOfDay.toISOString()),
  ]);

  const todayTotal = (todayOrders ?? []).reduce((s, o) => s + o.total_usd_cents, 0);
  const cashUsd = (todayPays ?? []).filter((p) => p.currency === "USD").reduce((s, p) => s + Number(p.amount_minor), 0);
  const cashLbp = (todayPays ?? []).filter((p) => p.currency === "LBP").reduce((s, p) => s + Number(p.amount_minor), 0);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">الطلبات</h1>
        </div>

        {/* اليوم — cash drawer expectation per currency */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">مبيعات اليوم</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{usd(todayTotal)}</p>
            <p className="text-xs text-muted-foreground">{(todayOrders ?? []).length} طلب</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">كاش دولار بالدرج (اليوم)</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{usd(cashUsd)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">كاش ليرة بالدرج (اليوم)</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{cashLbp.toLocaleString("en-US")} ل.ل</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/orders"
            className={`rounded-full border px-3 py-1 ${!status ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            الكل
          </Link>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <Link
              key={k}
              href={`/orders?status=${k}`}
              className={`rounded-full border px-3 py-1 ${status === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v}
            </Link>
          ))}
        </div>

        <div className="rounded-lg border">
          {(orders ?? []).length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">ما في طلبات بعد.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">رقم</th>
                  <th className="p-3 font-normal">الوقت</th>
                  <th className="p-3 font-normal">القناة</th>
                  <th className="p-3 font-normal">الفرع</th>
                  <th className="p-3 font-normal">الكاشير</th>
                  <th className="p-3 font-normal">قطع</th>
                  <th className="p-3 font-normal">الإجمالي</th>
                  <th className="p-3 font-normal">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((o) => {
                  const items = (o.order_items ?? []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3 font-mono">
                        <Link href={`/orders/${o.id}`} className="underline-offset-2 hover:underline">
                          #{o.number}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground" dir="ltr">
                        {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-3">{CHANNEL_LABELS[o.channel] ?? o.channel}</td>
                      <td className="p-3">{(o.branches as unknown as { name: string } | null)?.name}</td>
                      <td className="p-3">{(o.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                      <td className="p-3 font-mono">{items}</td>
                      <td className="p-3 font-mono">{usd(o.total_usd_cents)}</td>
                      <td className="p-3">
                        <Badge variant={o.status === "completed" ? "default" : "secondary"}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
