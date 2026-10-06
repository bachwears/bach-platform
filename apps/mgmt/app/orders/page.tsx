import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Icon } from "@bach/ui/components/icon";
import { OrderStatus } from "@bach/ui/components/order-status";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { PICKUP_BADGE } from "../../components/fulfilment";
import { PickupSettings } from "../../components/pickup-settings";
import { STATUS_LABELS, paymentLabel } from "../../lib/order-status";
import { beirutDayStart, fmt } from "../../lib/time";
import { EmptyState } from "@bach/ui/components/empty-state";

const CHANNEL_LABELS: Record<string, string> = { pos: "المحل", online: "أونلاين" };

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q: rawQ = "" } = await searchParams;
  const q = rawQ.trim().replace(/^#/, "");
  const supabase = await supabaseServer();

  // "Today" is the Beirut calendar day, not the server's (UTC).
  const startOfDay = beirutDayStart();

  let query = supabase
    .from("orders")
    .select(
      "id, number, channel, status, fulfilment, total_usd_cents, created_at, payment_method, ship_name, ship_phone, branches(name), profiles(full_name), customers(full_name, phone), order_items(quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(q ? 500 : 100);
  if (status && STATUS_LABELS[status]) query = query.eq("status", status);

  const [{ data: rows }, { data: todayOrders }, { data: todayPays }, { data: profile }, { data: pickupPays }, { data: atCourier }] = await Promise.all([
    query,
    supabase
      .from("orders")
      .select("total_usd_cents, status")
      .gte("created_at", startOfDay.toISOString())
      .not("status", "in", '("cancelled","returned")'),
    // Drawer = in-store cash only; Whish/card/wallet never touch the drawer,
    // and a cancelled or returned sale isn't cash we still hold.
    supabase
      .from("order_payments")
      .select("method, currency, amount_minor, orders!inner(created_at, status)")
      .eq("method", "cash")
      .gte("orders.created_at", startOfDay.toISOString())
      .not("orders.status", "in", '("cancelled","returned")'),
    supabase.auth.getUser().then(async ({ data: { user } }) =>
      supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle(),
    ),
    // Pickup orders paid in cash at the counter are drawer cash too, counted
    // on the day they were collected (same rule as the POS end-of-day report).
    supabase
      .from("order_payments")
      .select("currency, amount_minor, orders!inner(channel, fulfilment, status)")
      .eq("method", "cod")
      .eq("orders.channel", "online")
      .eq("orders.fulfilment", "pickup")
      .not("orders.status", "in", '("cancelled","returned")')
      .gte("created_at", startOfDay.toISOString()),
    // delivered cash-on-delivery money the courier hasn't paid over yet
    supabase
      .from("orders")
      .select("total_usd_cents")
      .eq("channel", "online")
      .eq("payment_method", "cod")
      .eq("fulfilment", "delivery")
      .in("status", ["delivered", "completed", "returned", "exchanged"])
      .is("cod_settled_at", null)
      .limit(1000),
  ]);
  // site_content is writable by these roles (RLS); others see the pickup card read-only
  const canEditPickup = ["super_admin", "store_manager", "marketing_manager"].includes(profile?.role ?? "");

  type Row = NonNullable<typeof rows>[number];
  const customerOf = (o: Row) => {
    const c = o.customers as unknown as { full_name: string | null; phone: string | null } | null;
    return { name: o.ship_name ?? c?.full_name ?? null, phone: o.ship_phone ?? c?.phone ?? null };
  };
  // Search: order number, customer name or phone (digits only, so +961 / spaces don't matter).
  const digits = q.replace(/\D/g, "");
  const orders = q
    ? (rows ?? []).filter((o) => {
        const c = customerOf(o);
        return (
          String(o.number) === q ||
          (c.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
        );
      })
    : (rows ?? []);

  const todayTotal = (todayOrders ?? []).reduce((s, o) => s + o.total_usd_cents, 0);
  const drawerPays = [...(todayPays ?? []), ...(pickupPays ?? [])];
  const cashUsd = drawerPays.filter((p) => p.currency === "USD").reduce((s, p) => s + Number(p.amount_minor), 0);
  const cashLbp = drawerPays.filter((p) => p.currency === "LBP").reduce((s, p) => s + Number(p.amount_minor), 0);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          icon="orders"
          title="الطلبات"
          description="كل طلبات المحل والأونلاين — افتح أي طلب لتشوف تفاصيلو وتغيّر حالتو."
          hint={{
            title: "شاشة الطلبات",
            what: "كل مبيعات المحل والأونلاين بمطرح واحد — الحالة بتتحرك من هون أو من طابور الـPOS، والنتيجة وحدة.",
            source: "فواتير الكاشير بتجي مباشرة من الـPOS، وطلبات الموقع من الشيك-آوت.",
            edit: "افتح أي طلب لتفاصيله وأزرار نقل الحالة أو الإلغاء.",
          }}
        />

        {/* اليوم (بتوقيت بيروت) — cash drawer expectation per currency */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">مبيعات اليوم</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{usd(todayTotal)}</p>
            <p className="text-xs text-muted-foreground">{(todayOrders ?? []).length} طلب</p>
          </div>
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">كاش دولار بالدرج (اليوم)</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{usd(cashUsd)}</p>
            <p className="text-xs text-muted-foreground">كاش بالمحل + طلبات الاستلام يلي انقبضت اليوم</p>
          </div>
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">كاش ليرة بالدرج (اليوم)</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{cashLbp.toLocaleString("en-US")} ل.ل</p>
            <p className="text-xs text-muted-foreground">كاش بالمحل + طلبات الاستلام يلي انقبضت اليوم</p>
          </div>
          <Link href="/orders/courier" className="border p-4 hover:border-foreground">
            <p className="text-sm text-muted-foreground">عند شركة الشحن</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{usd((atCourier ?? []).reduce((s, o) => s + o.total_usd_cents, 0))}</p>
            <p className="text-xs text-muted-foreground">{(atCourier ?? []).length} طلب وصل ولسّا ما قبضنا — افتح لتسجّل القبض</p>
          </Link>
        </div>

        <form action="/orders" className="flex flex-wrap items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="دوّر برقم الطلب، الاسم أو التلفون…"
            aria-label="دوّر برقم الطلب، الاسم أو التلفون"
            className="h-10 min-w-0 flex-1 border bg-background px-3 text-sm sm:max-w-sm"
          />
          <button type="submit" className="h-10 border px-4 text-sm hover:bg-muted">
            دوّر
          </button>
          {q ? (
            <Link href={status ? `/orders?status=${status}` : "/orders"} className="text-sm text-muted-foreground underline underline-offset-4">
              امسح البحث
            </Link>
          ) : null}
        </form>

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b text-sm" aria-label="فلترة حسب الحالة">
          <Link
            href={q ? `/orders?q=${encodeURIComponent(rawQ)}` : "/orders"}
            aria-current={!status ? "page" : undefined}
            className={`-mb-px border-b pb-2 ${!status ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            الكل
          </Link>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <Link
              key={k}
              href={`/orders?status=${k}${q ? `&q=${encodeURIComponent(rawQ)}` : ""}`}
              aria-current={status === k ? "page" : undefined}
              className={`-mb-px border-b pb-2 ${status === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {v}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto border">
          {orders.length === 0 ? (
            <EmptyState
              icon="orders"
              title={
                q
                  ? "ما في طلب بهالرقم أو الاسم أو التلفون — جرّب آخر أرقام التلفون، أو امسح البحث."
                  : status
                    ? `ما في طلبات حالتها «${STATUS_LABELS[status] ?? status}» هلّق.`
                    : "ما في طلبات بعد — أول بيعة بالكاشير أو أول طلب أونلاين بيطلع هون."
              }
              action={
                status ? (
                  <Link href={q ? `/orders?q=${encodeURIComponent(rawQ)}` : "/orders"} className="inline-block text-sm underline underline-offset-4 hover:text-foreground">
                    اعرض كل الطلبات
                  </Link>
                ) : null
              }
            />
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-start text-muted-foreground">
                  <th className="p-3 text-start font-normal">الطلب</th>
                  <th className="p-3 text-start font-normal">الوقت</th>
                  <th className="p-3 text-start font-normal">الزبون</th>
                  <th className="p-3 text-start font-normal">القناة</th>
                  <th className="p-3 text-start font-normal">الدفع</th>
                  <th className="p-3 text-start font-normal">الفرع</th>
                  <th className="p-3 text-start font-normal">الكاشير</th>
                  <th className="p-3 text-start font-normal">قطع</th>
                  <th className="p-3 text-start font-normal">الإجمالي</th>
                  <th className="p-3 text-start font-normal">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const items = (o.order_items ?? []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
                  const c = customerOf(o);
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3 font-mono">
                        <Link href={`/orders/${o.id}`} className="underline-offset-2 hover:underline">
                          #{o.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap p-3 text-muted-foreground" dir="ltr">
                        {fmt(o.created_at, { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-3">
                        {c.name ?? "زبون عابر"}
                        {c.phone ? (
                          <span className="block text-xs text-muted-foreground" dir="ltr">
                            {c.phone}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3">
                        {CHANNEL_LABELS[o.channel] ?? o.channel}
                        {o.fulfilment === "pickup" ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Icon name="branch" size={12} />{PICKUP_BADGE}</span>
                        ) : null}
                      </td>
                      <td className="p-3">{paymentLabel(o.payment_method)}</td>
                      <td className="p-3">{(o.branches as unknown as { name: string } | null)?.name}</td>
                      <td className="p-3">{(o.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                      <td className="p-3 font-mono">{items}</td>
                      <td className="p-3 font-mono">{usd(o.total_usd_cents)}</td>
                      <td className="p-3">
                        <OrderStatus status={o.status} fulfilment={o.fulfilment} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <PickupSettings canEdit={canEditPickup} />
      </main>
    </div>
  );
}
