import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";

import { Nav } from "../../../components/nav";
import { OrderStatusControl } from "../../../components/order-status-control";
import { STATUS_LABELS } from "../../../lib/order-status";

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: order }, { data: profile }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "*, branches(name), profiles(full_name), order_items(*), order_payments(*), customers(full_name, phone)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser().then(async ({ data: { user } }) =>
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
    ),
  ]);

  if (!order) notFound();

  const canManage = ["super_admin", "store_manager", "support_agent"].includes(profile?.role ?? "");
  const rate = Number(order.lbp_per_usd);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="font-mono">#{order.number}</span>
            </h1>
            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
            ← رجوع للطلبات
          </Link>
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="الوقت" value={new Date(order.created_at).toLocaleString("en-GB")} ltr />
          <Info label="الفرع" value={(order.branches as unknown as { name: string } | null)?.name ?? "—"} />
          <Info label="الكاشير" value={(order.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"} />
          <Info
            label="الزبون"
            value={(order.customers as unknown as { full_name: string | null } | null)?.full_name ?? "زبون عابر"}
          />
        </div>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-muted-foreground">
                <th className="p-3 font-normal">القطعة</th>
                <th className="p-3 font-normal">SKU</th>
                <th className="p-3 font-normal">الكمية</th>
                <th className="p-3 font-normal">السعر</th>
                <th className="p-3 font-normal">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items ?? []).map((i: Record<string, unknown>) => (
                <tr key={String(i.id)} className="border-b last:border-0">
                  <td className="p-3">
                    {String(i.name_en)}
                    <span className="block text-xs text-muted-foreground">
                      {String(i.size)} {String(i.color_en)}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs" dir="ltr">
                    {String(i.sku ?? "—")}
                  </td>
                  <td className="p-3 font-mono">{Number(i.quantity)}</td>
                  <td className="p-3 font-mono">{usd(Number(i.unit_price_usd_cents))}</td>
                  <td className="p-3 font-mono">{usd(Number(i.line_total_usd_cents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <h2 className="font-medium">الحساب</h2>
            <Row label="المجموع" value={usd(order.subtotal_usd_cents)} />
            {order.discount_usd_cents > 0 && <Row label="الخصم" value={`- ${usd(order.discount_usd_cents)}`} />}
            {order.tva_usd_cents > 0 && <Row label="TVA" value={usd(order.tva_usd_cents)} />}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>الإجمالي</span>
              <span className="font-mono">
                {usd(order.total_usd_cents)} / {Math.round((order.total_usd_cents / 100) * rate).toLocaleString("en-US")} ل.ل
              </span>
            </div>
            <p className="text-xs text-muted-foreground">سعر الصرف وقت البيع: {rate.toLocaleString("en-US")} ل.ل / $</p>
          </div>

          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <h2 className="font-medium">الدفعات</h2>
            {(order.order_payments ?? []).map((p: Record<string, unknown>) => (
              <Row
                key={String(p.id)}
                label={p.currency === "USD" ? "كاش دولار" : "كاش ليرة"}
                value={
                  p.currency === "USD"
                    ? usd(Number(p.amount_minor))
                    : `${Number(p.amount_minor).toLocaleString("en-US")} ل.ل`
                }
              />
            ))}
            {canManage && (
              <div className="border-t pt-3">
                <OrderStatusControl orderId={order.id} currentStatus={order.status} />
              </div>
            )}
          </div>
        </div>

        {order.note && <p className="rounded-lg border p-4 text-sm text-muted-foreground">ملاحظة: {order.note}</p>}
      </main>
    </div>
  );
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
