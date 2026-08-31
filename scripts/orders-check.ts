/**
 * Orders + POS checkout verification (§13 tests: order totals, dual-currency
 * math, stock decrement, RLS). Run like catalog-check:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANON_KEY=... \
 *     SEED_TEMP_PASSWORD=... pnpm tsx scripts/orders-check.ts
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
const run = Date.now().toString(36);

async function main() {
  const { data: branch } = await svc.from("branches").select("id").limit(1).single();
  const { data: cat } = await svc.from("categories").select("id").limit(1).single();

  // Rate: 90,000 LBP per USD for stable math.
  await svc.from("exchange_rates").insert({ lbp_per_usd: 90000 });

  // Product at $20.00 with a variant, stocked 10 units.
  const { data: prod } = await svc
    .from("products")
    .insert({
      name_en: `Order Test ${run}`,
      name_ar: `تجربة طلب ${run}`,
      slug: `order-test-${run}`,
      category_id: cat!.id,
      price_usd_cents: 2000,
      status: "published",
    })
    .select("id")
    .single();
  const { data: variant } = await svc
    .from("product_variants")
    .insert({ product_id: prod!.id, size: "L", color_code: "BLK", color_en: "Black", color_ar: "أسود" })
    .select("id, sku")
    .single();
  await svc.from("inventory_movements").insert({
    variant_id: variant!.id,
    branch_id: branch!.id,
    delta: 10,
    reason: "purchase",
  });

  const cashier = createClient(URL, ANON, { auth: { persistSession: false } });
  const login = await cashier.auth.signInWithPassword({ email: "cashier@bachwears.com", password: PASS });
  check("cashier signs in", !login.error, login.error?.message);

  // 2 × $20 = $40. Pay $20 in USD + 1,800,000 LBP (= $20 at 90k).
  const { data: sale, error: saleErr } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: variant!.id, quantity: 2 }],
    p_payments: [
      { currency: "USD", amount_minor: 2000 },
      { currency: "LBP", amount_minor: 1_800_000 },
    ],
  });
  check("pos_checkout succeeds", !saleErr, saleErr?.message);
  const orderId = sale?.[0]?.order_id;
  check("returns order number", (sale?.[0]?.order_number ?? 0) > 0);

  const { data: order } = await svc
    .from("orders")
    .select("status, channel, subtotal_usd_cents, total_usd_cents, lbp_per_usd")
    .eq("id", orderId)
    .single();
  check("order completed via pos", order?.status === "completed" && order?.channel === "pos");
  check("subtotal is $40.00", order?.subtotal_usd_cents === 4000, String(order?.subtotal_usd_cents));
  check("rate captured", Number(order?.lbp_per_usd) === 90000, String(order?.lbp_per_usd));

  const { data: items } = await svc.from("order_items").select("*").eq("order_id", orderId);
  check("one snapshot line, qty 2", items?.length === 1 && items[0].quantity === 2);
  check("name snapshot kept", items?.[0]?.name_ar?.includes("تجربة"));

  const { data: pays } = await svc.from("order_payments").select("*").eq("order_id", orderId);
  const paid = (pays ?? []).reduce((s, p) => s + p.usd_equiv_cents, 0);
  check("mixed tender = $40.00 equiv", paid === 4000, String(paid));

  const { data: level } = await svc
    .from("inventory_levels")
    .select("quantity")
    .eq("variant_id", variant!.id)
    .eq("branch_id", branch!.id)
    .single();
  check("stock decremented 10 → 8", level?.quantity === 8, String(level?.quantity));

  // Overselling must fail.
  const { error: overErr } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: variant!.id, quantity: 99 }],
    p_payments: [{ currency: "USD", amount_minor: 999900 }],
  });
  check("oversell rejected", !!overErr, overErr?.message?.slice(0, 60));

  // Underpayment must fail.
  const { error: underErr } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: variant!.id, quantity: 1 }],
    p_payments: [{ currency: "USD", amount_minor: 100 }],
  });
  check("underpayment rejected", !!underErr);

  // Discount: 50% off one unit → $10, pay exactly 900,000 LBP.
  const { data: disc, error: discErr } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: variant!.id, quantity: 1 }],
    p_payments: [{ currency: "LBP", amount_minor: 900_000 }],
    p_discount_basis_points: 5000,
  });
  check("50% discount sale in pure LBP", !discErr, discErr?.message);
  const { data: dOrder } = await svc
    .from("orders")
    .select("total_usd_cents, discount_usd_cents")
    .eq("id", disc?.[0]?.order_id)
    .single();
  check("discounted total $10.00", dOrder?.total_usd_cents === 1000, String(dOrder?.total_usd_cents));

  // Anonymous cannot checkout.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: anonErr } = await anon.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: variant!.id, quantity: 1 }],
    p_payments: [{ currency: "USD", amount_minor: 2000 }],
  });
  check("anon checkout rejected", !!anonErr);

  // Cleanup test rows (orders cascade their items/payments).
  await svc.from("orders").delete().in(
    "id",
    [orderId, disc?.[0]?.order_id].filter(Boolean),
  );
  await svc.from("inventory_movements").delete().eq("variant_id", variant!.id);
  await svc.from("products").delete().eq("id", prod!.id);

  console.log(failures ? `\n${failures} FAILURES` : "\nAll order checks passed.");
  process.exit(failures ? 1 : 0);
}

main();
