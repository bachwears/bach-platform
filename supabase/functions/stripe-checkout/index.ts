// Stripe Checkout session for a pending online order (§9 — dormant until
// STRIPE_SECRET_KEY exists; activation is keys + the MGMT toggle only).
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return Response.json({ error: "card payments not configured" }, { status: 503, headers: cors });

  let body: { order_id?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  const origin = (body.origin ?? "https://bachwears.com").replace(/\/$/, "");
  if (!/^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-z0-9-]+\.)?bachwears\.com)$/.test(origin)) {
    return Response.json({ error: "bad origin" }, { status: 400, headers: cors });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, number, status, payment_method, total_usd_cents, ship_name")
    .eq("id", body.order_id)
    .maybeSingle();
  if (!order || order.status !== "pending" || order.payment_method !== "stripe") {
    return Response.json({ error: "order not payable" }, { status: 400, headers: cors });
  }
  const { data: paid } = await supabase.from("order_payments").select("id").eq("order_id", order.id).limit(1);
  if (paid?.length) return Response.json({ error: "already paid" }, { status: 400, headers: cors });

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(order.total_usd_cents),
    "line_items[0][price_data][product_data][name]": `BACH Wears — Order #${order.number}`,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/confirmed?n=${order.number}&paid=1`,
    cancel_url: `${origin}/confirmed?n=${order.number}&paid=0`,
    client_reference_id: order.id,
    "metadata[order_id]": order.id,
    "metadata[order_number]": String(order.number),
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    return Response.json({ error: "stripe error" }, { status: 502, headers: cors });
  }
  const session = await res.json();
  return Response.json({ url: session.url }, { headers: cors });
});
