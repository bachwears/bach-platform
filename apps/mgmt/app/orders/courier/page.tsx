import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { CourierCash, type WaitingOrder } from "../../../components/courier-cash";
import { Nav } from "../../../components/nav";
import { fmt } from "../../../lib/time";

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DEST: Record<string, string> = { drawer: "درج المحل", safe: "الخزنة", bank: "البنك", other: "غير مكان" };

interface Settlement {
  id: string;
  received_on: string;
  usd_cents: number;
  lbp: number;
  expected_usd_cents: number;
  destination: string;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
  orders: Array<{ number: number }>;
}

/**
 * Courier cash: a delivered cash-on-delivery order is money with the courier
 * until they pay it over (often days later). Waiting orders on top, the
 * history of payments received below.
 */
export default async function CourierCashPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: waiting, error }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("orders")
      .select("id, number, total_usd_cents, delivered_at, ship_name, ship_city")
      .eq("channel", "online")
      .eq("payment_method", "cod")
      .eq("fulfilment", "delivery")
      .in("status", ["delivered", "completed", "returned", "exchanged"])
      .is("cod_settled_at", null)
      .order("delivered_at", { ascending: true })
      .limit(500),
    supabase
      .from("courier_settlements")
      .select("id, received_on, usd_cents, lbp, expected_usd_cents, destination, note, created_at, profiles(full_name), orders!orders_cod_settlement_id_fkey(number)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const orders = (waiting ?? []) as WaitingOrder[];
  const total = orders.reduce((s, o) => s + o.total_usd_cents, 0);
  const canRecord = ["super_admin", "store_manager"].includes(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-8 p-4 py-8">
        <PageHeader
          back={{ href: "/orders", label: "الطلبات" }}
          title="مصاري الشحن"
          description={
            <>
              مصاري «الدفع عند الاستلام» يلي قبضها الدليفري ولسّا ما سلّمنا ياها — علّم الطلبات يلي انقبضت وسجّل الاستلام. عند شركة الشحن هلّق:{" "}
              <span className="font-mono text-foreground" dir="ltr">
                {usd(total)}
              </span>{" "}
              · {orders.length} طلب
            </>
          }
          hint={{
            title: "مصاري عند شركة الشحن",
            what: "طلبات الدفع عند الاستلام يلي وصلت للزبون: الدليفري قبض المصاري، بس بعدها مش عنّا لحتى شركة الشحن تسلّمنا ياها (أحياناً بعد أسبوع). هون منتابعها ومنسجّل كل استلام.",
            source: "الطلبات يلي حالتها «وصل» والدفع عند الاستلام ولسّا ما انسجّل استلامها.",
            edit: "علّم الطلبات يلي انقبضت، اكتب المبلغ ووين انحطّ، وسجّل. المدير أو السوبر أدمن.",
          }}
        />

        {error ? <p role="alert" className="border border-destructive/40 p-4 text-sm text-destructive">ما قدرنا نحمّل الطلبات: {error.message} — حدّث الصفحة، وإذا ضلّت، احكي السوبر أدمن.</p> : <CourierCash orders={orders} canRecord={canRecord} />}

        <section className="space-y-3">
          <h2 className="font-medium">تاريخ الاستلام</h2>
          {(history ?? []).length === 0 ? (
            <p className="border p-6 text-center text-sm text-muted-foreground">ما انسجّل ولا استلام بعد — كل استلام بتسجّلو فوق بيطلع هون.</p>
          ) : (
            <ul className="divide-y border text-sm">
              {((history ?? []) as unknown as Settlement[]).map((s) => {
                const diff = s.usd_cents - s.expected_usd_cents;
                return (
                  <li key={s.id} className="space-y-1 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {s.received_on} · {DEST[s.destination] ?? s.destination}
                        <span className="text-muted-foreground"> · {s.profiles?.full_name ?? "—"}</span>
                      </span>
                      <span className="font-mono" dir="ltr">
                        {usd(s.usd_cents)}
                        {s.lbp ? ` + ${s.lbp.toLocaleString("en-US")} ل.ل` : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      طلبات: {s.orders.map((o) => `#${o.number}`).join("، ")} · المتوقّع {usd(s.expected_usd_cents)}
                      {s.lbp === 0 && diff !== 0 ? (
                        <span className={diff < 0 ? "text-destructive" : ""}> · فرق {diff > 0 ? "+" : "−"}{usd(Math.abs(diff))}</span>
                      ) : null}
                      {s.note ? ` · ${s.note}` : ""} · {fmt(new Date(s.created_at))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
