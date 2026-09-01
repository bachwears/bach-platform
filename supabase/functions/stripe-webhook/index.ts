// Stripe webhook: checkout.session.completed → record the payment and
// confirm the order. Signature-verified with STRIPE_WEBHOOK_SECRET.
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });
  const payload = await req.text();
  if (!(await verify(payload, req.headers.get("stripe-signature"), secret))) {
    return Response.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(payload);
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const session = event.data.object;
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  const amount = Number(session.amount_total ?? 0);
  if (!orderId || !amount) return Response.json({ received: true });

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_usd_cents")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return Response.json({ received: true });
  const { data: existing } = await supabase.from("order_payments").select("id").eq("order_id", orderId).limit(1);
  if (existing?.length) return Response.json({ received: true }); // idempotent

  await supabase.from("order_payments").insert({
    order_id: orderId,
    method: "stripe",
    currency: "USD",
    amount_minor: amount,
    usd_equiv_cents: amount,
  });
  if (order.status === "pending") {
    await supabase.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", orderId);
  }
  return Response.json({ received: true });
});
