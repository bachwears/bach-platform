import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";
import { OrderStatus } from "@bach/ui/components/order-status";
import { PageHeader } from "@bach/ui/components/page-header";
import { Thumb } from "@bach/ui/components/thumb";
import { thumbUrl } from "@bach/ui/lib/photos";

import { Nav } from "../../../components/nav";
import { OrderStatusControl } from "../../../components/order-status-control";
import { PICKUP_BADGE } from "../../../components/fulfilment";
import { paymentLabel } from "../../../lib/order-status";
import { fmt } from "../../../lib/time";
import { Icon, type IconName } from "@bach/ui/components/icon";

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
        "*, branches(name), profiles(full_name), order_items(*, product_variants(products(media_assets(kind, storage_path, color_en, sort)))), order_payments(*), customers(full_name, phone)",
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
  const isPickup = (order as { fulfilment?: string }).fulfilment === "pickup";

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          icon="orders"
          back={{ href: "/orders", label: "الطلبات" }}
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span>
                طلب{" "}
                <span className="font-mono" dir="ltr">
                  #{order.number}
                </span>
              </span>
              <OrderStatus status={order.status} fulfilment={(order as { fulfilment?: string }).fulfilment} />
              {isPickup ? <Badge variant="outline" className="gap-1"><Icon name="branch" size={12} />{PICKUP_BADGE}</Badge> : null}
            </span>
          }
          description={
            order.channel === "online"
              ? "طلب أونلاين — حرّكو خطوة خطوة من «حالة الطلب» تحت."
              : "بيعة بالمحل — انسكّرت عالكاشير. الإرجاع أو التبديل بيتسجّل من شاشة المرتجعات بالكاشير."
          }
          hint={{
            title: "تفاصيل الطلب",
            what: "كل شي عن الطلب: الزبون، التوصيل، القطع، الحساب والدفعات.",
            source: "بيعات الكاشير من الـPOS، وطلبات الموقع من الشيك-آوت.",
            edit: "الحالة من «حالة الطلب» (للسوبر أدمن، مدير المحل وخدمة الزبائن). القطع والأسعار ما بتتعدّل بعد البيع.",
          }}
        />

        {canManage && (
          <section className="space-y-3 border p-4 text-sm">
            <h2 className="flex items-center gap-2 font-medium"><Icon name="statusConfirmed" size={18} className="text-muted-foreground" />حالة الطلب</h2>
            <OrderStatusControl
              orderId={order.id}
              currentStatus={order.status}
              channel={order.channel}
              paymentMethod={order.payment_method}
              totalUsdCents={order.total_usd_cents}
              lbpPerUsd={todayRate}
              fulfilment={(order as { fulfilment?: string }).fulfilment}
            />
          </section>
        )}

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
          <div className="grid gap-4 border p-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 font-medium"><Icon name="address" size={18} className="text-muted-foreground" />{isPickup ? PICKUP_BADGE : "التوصيل"}</h2>
              <p>{order.ship_name ?? "—"}</p>
              {order.ship_phone ? (
                <p className="flex flex-wrap items-center gap-3" dir="ltr">
                  <a href={`tel:${order.ship_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline">
                    <Icon name="phone" size={14} />
                    {order.ship_phone}
                  </a>
                  <a
                    href={`https://wa.me/${order.ship_phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^(?!961)/, "961")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <Icon name="whatsapp" size={14} />
                    WhatsApp
                  </a>
                </p>
              ) : null}
              <p className="flex items-start gap-1.5 text-muted-foreground">
                <Icon name="address" size={14} className="mt-1 shrink-0" />
                {[order.ship_city, order.ship_address].filter(Boolean).join(" — ") || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 font-medium"><Icon name="card" size={18} className="text-muted-foreground" />طريقة الدفع</h2>
              <p>{paymentLabel(order.payment_method)}</p>
              {order.payment_method === "cod" ? (
                <p className="text-xs text-muted-foreground">
                  {isPickup ? "بيندفع بالمحل وقت الاستلام — كاش أو Whish." : "بيندفع للمندوب وقت التسليم."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3 text-start font-normal">القطعة</th>
                <th className="p-3 text-start font-normal">SKU</th>
                <th className="p-3 text-start font-normal">الكمية</th>
                <th className="p-3 text-start font-normal">السعر</th>
                <th className="p-3 text-start font-normal">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items ?? []).map((i: Record<string, unknown>) => (
                <tr key={String(i.id)} className="border-b last:border-0">
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      {(() => {
                        // front photo in the line's colour helps picking the right piece off the shelf
                        const media =
                          (i.product_variants as {
                            products?: { media_assets?: Array<{ kind: string; storage_path: string; color_en: string | null; sort: number }> };
                          } | null)?.products?.media_assets ?? [];
                        const colour = String(i.color_en ?? "").trim().toLowerCase();
                        const fronts = media.filter((m) => m.storage_path.includes("/front-")).sort((a, b) => a.sort - b.sort);
                        const front =
                          fronts.find((m) => colour && (m.color_en ?? "").trim().toLowerCase() === colour)?.storage_path ??
                          media.find((m) => m.kind === "front")?.storage_path;
                        return <Thumb src={thumbUrl(front)} size="lg" />;
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
          <div className="space-y-2 border p-4 text-sm">
            <h2 className="flex items-center gap-2 font-medium"><Icon name="price" size={18} className="text-muted-foreground" />الحساب</h2>
            <Row label="المجموع" value={usd(order.subtotal_usd_cents)} />
            {order.discount_usd_cents > 0 && <Row label="الخصم" value={`- ${usd(order.discount_usd_cents)}`} />}
            {order.tva_usd_cents > 0 && <Row label="TVA" value={usd(order.tva_usd_cents)} />}
            {(order as { delivery_usd_cents?: number }).delivery_usd_cents ? (
              <Row label="التوصيل" value={usd((order as { delivery_usd_cents?: number }).delivery_usd_cents!)} />
            ) : null}
            <div className="flex justify-between gap-3 border-t pt-2 font-medium">
              <span>الإجمالي</span>
              <span className="font-mono" dir="ltr">
                {usd(order.total_usd_cents)} / {Math.round((order.total_usd_cents / 100) * rate).toLocaleString("en-US")} ل.ل
              </span>
            </div>
            <p className="text-xs text-muted-foreground">سعر الصرف وقت البيع: {rate.toLocaleString("en-US")} ل.ل / $</p>
          </div>

          <div className="space-y-2 border p-4 text-sm">
            <h2 className="flex items-center gap-2 font-medium"><Icon name="cash" size={18} className="text-muted-foreground" />الدفعات</h2>
            {(order.order_payments ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                {order.payment_method === "cod"
                  ? isPickup
                    ? "لسّا ما في دفعات — بيندفع بالمحل وقت الاستلام."
                    : "لسّا ما في دفعات — بيندفع للمندوب وقت التسليم."
                  : "لسّا ما في دفعات مسجّلة."}
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
          </div>
        </div>

        {order.note && (
          <p className="flex items-start gap-2 border p-4 text-sm text-muted-foreground">
            <Icon name="note" size={16} className="mt-0.5 shrink-0" />
            ملاحظة: {order.note}
          </p>
        )}
      </main>
    </div>
  );
}

const INFO_ICON: Record<string, IconName> = { الوقت: "time", الفرع: "branch", الكاشير: "user" };

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {INFO_ICON[label] ? <Icon name={INFO_ICON[label]!} size={14} /> : null}
        {label}
      </p>
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
