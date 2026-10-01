import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";

import { Nav } from "../../../components/nav";
import { OrderStatusControl } from "../../../components/order-status-control";
import { STATUS_LABELS, paymentLabel } from "../../../lib/order-status";
import { fmt } from "../../../lib/time";

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
        "*, branches(name), profiles(full_name), order_items(*, product_variants(products(media_assets(kind, storage_path)))), order_payments(*), customers(full_name, phone)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser().then(async ({ data: { user } }) =>
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
    ),
  ]);

  if (!order) notFound();

  // today's rate converts LBP the courier collected (the RPC uses the same one)
  const { data: rateRow } = await supabase
    .from("exchange_rates")
    .select("lbp_per_usd")
    .order("effective_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const todayRate = Number(rateRow?.lbp_per_usd ?? 0);
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
            → رجوع للطلبات
          </Link>
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="الوقت" value={fmt(order.created_at)} ltr />
          <Info label="الفرع" value={(order.branches as unknown as { name: string } | null)?.name ?? "—"} />
          <Info label="الكاشير" value={(order.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"} />
          <Info
            label="الزبون"
            value={(order.customers as unknown as { full_name: string | null } | null)?.full_name ?? order.ship_name ?? "زبون عابر"}
          />
        </div>

        {order.channel === "online" || order.ship_address ? (
          <div className="grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <h2 className="font-medium">التوصيل</h2>
              <p>{order.ship_name ?? "—"}</p>
              {order.ship_phone ? (
                <p className="flex flex-wrap items-center gap-3" dir="ltr">
                  <a href={`tel:${order.ship_phone.replace(/[^\d+]/g, "")}`} className="font-mono underline-offset-2 hover:underline">
                    {order.ship_phone}
                  </a>
                  <a
                    href={`https://wa.me/${order.ship_phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^(?!961)/, "961")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    WhatsApp
                  </a>
                </p>
              ) : null}
              <p className="text-muted-foreground">
                {[order.ship_city, order.ship_address].filter(Boolean).join(" — ") || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <h2 className="font-medium">طريقة الدفع</h2>
              <p>{paymentLabel(order.payment_method)}</p>
              {order.payment_method === "cod" ? (
                <p className="text-xs text-muted-foreground">بيندفع للمندوب وقت التسليم.</p>
              ) : null}
            </div>
          </div>
        ) : null}

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
                    <span className="flex items-center gap-3">
                      {(() => {
                        // front photo helps picking the right piece off the shelf
                        const media =
                          (i.product_variants as { products?: { media_assets?: Array<{ kind: string; storage_path: string }> } } | null)
                            ?.products?.media_assets ?? [];
                        const front = media.find((m) => m.kind === "front")?.storage_path;
                        return front ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={front} alt="" className="h-14 w-11 shrink-0 rounded-sm bg-muted object-cover" />
                        ) : (
                          <span className="h-14 w-11 shrink-0 rounded-sm bg-muted" />
                        );
                      })()}
                      <span>
                    {String(i.name_en)}
                    <span className="block text-xs text-muted-foreground">
                      {String(i.size)} {String(i.color_en)}
                    </span>
                      </span>
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
            {(order.order_payments ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                {order.payment_method === "cod" ? "لسّا ما في دفعات — بيندفع للمندوب وقت التسليم." : "لسّا ما في دفعات مسجّلة."}
              </p>
            ) : null}
            {(order.order_payments ?? []).map((p: Record<string, unknown>) => (
              <Row
                key={String(p.id)}
                label={`${paymentLabel(String(p.method))} · ${p.currency === "USD" ? "دولار" : "ليرة"}`}
                value={
                  p.currency === "USD"
                    ? usd(Number(p.amount_minor))
                    : `${Number(p.amount_minor).toLocaleString("en-US")} ل.ل`
                }
              />
            ))}
            {canManage && (
              <div className="border-t pt-3">
                <OrderStatusControl
                  orderId={order.id}
                  currentStatus={order.status}
                  channel={order.channel}
                  paymentMethod={order.payment_method}
                  totalUsdCents={order.total_usd_cents}
                  lbpPerUsd={todayRate}
                />
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
