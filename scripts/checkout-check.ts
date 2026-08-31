/**
 * Storefront checkout + fulfillment queue verification.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANON_KEY=... \
 *     SEED_TEMP_PASSWORD=... pnpm tsx scripts/checkout-check.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.ANON_KEY!;
const PASS = process.env.SEED_TEMP_PASSWORD!;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const run = Date.now().toString(36);

async function level(variantId: string, branchId: string) {
  const { data } = await svc
    .from("inventory_levels")
    .select("quantity, reserved")
    .eq("variant_id", variantId)
    .eq("branch_id", branchId)
    .single();
  return data!;
}

async function main() {
  const { data: branch } = await svc.from("branches").select("id").limit(1).single();
  const { data: cat } = await svc.from("categories").select("id").limit(1).single();
  await svc.from("exchange_rates").insert({ lbp_per_usd: 90000 });

  const { data: prod } = await svc
    .from("products")
    .insert({ name_en: `Web ${run}`, name_ar: `ويب ${run}`, slug: `web-${run}`, category_id: cat!.id, price_usd_cents: 4000, status: "published" })
    .select("id")
    .single();
  const { data: v } = await svc
    .from("product_variants")
    .insert({ product_id: prod!.id, size: "M", color_code: "BLK", color_en: "Black", color_ar: "أسود" })
    .select("id")
    .single();
  await svc.from("inventory_movements").insert({ variant_id: v!.id, branch_id: branch!.id, delta: 5, reason: "purchase" });

  // Guest places an order for 2 units.
  const { data: ord, error: ordErr } = await anon.rpc("storefront_checkout", {
    p_items: [{ variant_id: v!.id, quantity: 2 }],
    p_name: "Guest Tester",
    p_phone: "+961 71 000 111",
    p_city: "Tripoli",
    p_address: "Main street, bldg 4",
    p_note: "call before delivery",
  });
  check("guest checkout succeeds", !ordErr, ordErr?.message);
  const orderId = ord?.[0]?.order_id;
  check("returns order number", (ord?.[0]?.order_number ?? 0) > 0);

  let lvl = await level(v!.id, branch!.id);
  check("stock reserved not sold (q=5, r=2)", lvl.quantity === 5 && lvl.reserved === 2, JSON.stringify(lvl));

  const { data: o } = await svc.from("orders").select("channel, status, ship_city, ship_phone, total_usd_cents, customer_id").eq("id", orderId).single();
  check("online pending order", o?.channel === "online" && o?.status === "pending");
  check("ship info captured", o?.ship_city === "Tripoli" && o?.ship_phone === "+96171000111");
  check("total $80.00", o?.total_usd_cents === 8000, String(o?.total_usd_cents));

  const { data: cust } = await svc.from("customers").select("full_name, phone").eq("id", o!.customer_id).single();
  check("customer created by phone", cust?.phone === "+96171000111" && cust?.full_name === "Guest Tester");

  // Oversell across reservation must fail (only 3 unreserved left).
  const { error: overErr } = await anon.rpc("storefront_checkout", {
    p_items: [{ variant_id: v!.id, quantity: 4 }],
    p_name: "Second Guest",
    p_phone: "+96171000222",
    p_city: "Beirut",
    p_address: "x",
  });
  check("reservation-aware oversell rejected", !!overErr, overErr?.message);

  // Bad input guards.
  const { error: badPhone } = await anon.rpc("storefront_checkout", {
    p_items: [{ variant_id: v!.id, quantity: 1 }],
    p_name: "X",
    p_phone: "12",
    p_city: "Beirut",
    p_address: "x",
  });
  check("short phone rejected", !!badPhone);

  // Anonymous cannot advance the queue.
  const { error: anonAdv } = await anon.rpc("advance_online_order", { p_order_id: orderId, p_next: "confirmed" });
  check("anon queue advance rejected", !!anonAdv);

  // Cashier drives the queue.
  const cashier = createClient(URL, ANON, { auth: { persistSession: false } });
  await cashier.auth.signInWithPassword({ email: "cashier@bachwears.com", password: PASS });
  for (const next of ["confirmed", "picking", "packed"]) {
    const { error } = await cashier.rpc("advance_online_order", { p_order_id: orderId, p_next: next });
    check(`advance to ${next}`, !error, error?.message);
  }

  lvl = await level(v!.id, branch!.id);
  check("packed: stock sold, reservation released (q=3, r=0)", lvl.quantity === 3 && lvl.reserved === 0, JSON.stringify(lvl));

  // Illegal jump rejected.
  const { error: skipErr } = await cashier.rpc("advance_online_order", { p_order_id: orderId, p_next: "completed" });
  check("packed → completed shortcut rejected", !!skipErr);

  for (const next of ["shipped", "delivered", "completed"]) {
    const { error } = await cashier.rpc("advance_online_order", { p_order_id: orderId, p_next: next });
    check(`advance to ${next}`, !error, error?.message);
  }

  // Cancel path releases reservation.
  const { data: ord2 } = await anon.rpc("storefront_checkout", {
    p_items: [{ variant_id: v!.id, quantity: 1 }],
    p_name: "Cancel Me",
    p_phone: "+96171000333",
    p_city: "Beirut",
    p_address: "y",
  });
  const { error: cancelErr } = await cashier.rpc("advance_online_order", { p_order_id: ord2?.[0]?.order_id, p_next: "cancelled" });
  check("cancel pending order", !cancelErr, cancelErr?.message);
  lvl = await level(v!.id, branch!.id);
  check("cancel releases reservation (q=3, r=0)", lvl.quantity === 3 && lvl.reserved === 0, JSON.stringify(lvl));

  // Cleanup.
  const ids = [orderId, ord2?.[0]?.order_id].filter(Boolean);
  await svc.from("orders").delete().in("id", ids);
  await svc.from("customers").delete().in("phone", ["+96171000111", "+96171000222", "+96171000333"]);
  await svc.from("inventory_movements").delete().eq("variant_id", v!.id);
  await svc.from("products").delete().eq("id", prod!.id);

  console.log(failures ? `\n${failures} FAILURES` : "\nAll checkout checks passed.");
  process.exit(failures ? 1 : 0);
}

main();
