/**
 * Returns + exchange verification (§13: returns/exchanges impact, loyalty math).
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANON_KEY=... \
 *     SEED_TEMP_PASSWORD=... pnpm tsx scripts/returns-check.ts
 * SEED_TEMP_PASSWORD must be the *current* cashier password.
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
  await svc.from("exchange_rates").insert({ lbp_per_usd: 90000 });

  // Product A $30, product B $50; stock 10 each.
  async function mkProduct(name: string, cents: number) {
    const { data: prod } = await svc
      .from("products")
      .insert({ name_en: name, name_ar: name, slug: `${name.toLowerCase().replace(/ /g, "-")}-${run}`, category_id: cat!.id, price_usd_cents: cents, status: "published" })
      .select("id")
      .single();
    const { data: v } = await svc
      .from("product_variants")
      .insert({ product_id: prod!.id, size: "L", color_code: "BLK", color_en: "Black", color_ar: "أسود" })
      .select("id")
      .single();
    await svc.from("inventory_movements").insert({ variant_id: v!.id, branch_id: branch!.id, delta: 10, reason: "purchase" });
    return { productId: prod!.id, variantId: v!.id };
  }
  const A = await mkProduct(`Ret A ${run}`, 3000);
  const B = await mkProduct(`Ret B ${run}`, 5000);

  const cashier = createClient(URL, ANON, { auth: { persistSession: false } });
  const login = await cashier.auth.signInWithPassword({ email: "cashier@bachwears.com", password: PASS });
  check("cashier signs in", !login.error, login.error?.message);

  // Sale: 2×A + 1×B = $110, with 10% discount → total $99. Paid $99 USD.
  const { data: sale, error: saleErr } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [
      { variant_id: A.variantId, quantity: 2 },
      { variant_id: B.variantId, quantity: 1 },
    ],
    p_payments: [{ currency: "USD", amount_minor: 9900 }],
    p_discount_basis_points: 1000,
  });
  check("discounted sale succeeds", !saleErr, saleErr?.message);
  const orderId = sale?.[0]?.order_id;

  const { data: items } = await svc.from("order_items").select("id, variant_id, quantity").eq("order_id", orderId);
  const itemA = items?.find((i) => i.variant_id === A.variantId);
  const itemB = items?.find((i) => i.variant_id === B.variantId);

  // Return 1×A. Paid value: $30 × 0.9 = $27.00.
  const { data: ret, error: retErr } = await cashier.rpc("pos_return", {
    p_order_id: orderId,
    p_items: [{ order_item_id: itemA!.id, quantity: 1 }],
    p_refunds: [{ currency: "LBP", amount_minor: 2_430_000 }], // $27 at 90k
  });
  check("partial return succeeds", !retErr, retErr?.message);
  check("credit = $27.00 (discount-aware)", ret?.[0]?.credit_usd_cents === 2700, String(ret?.[0]?.credit_usd_cents));

  const { data: lvlA } = await svc.from("inventory_levels").select("quantity").eq("variant_id", A.variantId).eq("branch_id", branch!.id).single();
  check("stock restored 8 → 9", lvlA?.quantity === 9, String(lvlA?.quantity));

  const { data: ordAfter } = await svc.from("orders").select("status").eq("id", orderId).single();
  check("partial return keeps order completed", ordAfter?.status === "completed", ordAfter?.status);

  // Over-return must fail (only 1×A left returnable).
  const { error: overErr } = await cashier.rpc("pos_return", {
    p_order_id: orderId,
    p_items: [{ order_item_id: itemA!.id, quantity: 2 }],
    p_refunds: [{ currency: "USD", amount_minor: 5400 }],
  });
  check("over-return rejected", !!overErr, overErr?.message?.slice(0, 50));

  // Wrong refund amount must fail.
  const { error: wrongErr } = await cashier.rpc("pos_return", {
    p_order_id: orderId,
    p_items: [{ order_item_id: itemA!.id, quantity: 1 }],
    p_refunds: [{ currency: "USD", amount_minor: 100 }],
  });
  check("mismatched refund rejected", !!wrongErr);

  // Exchange: return 1×B (credit $45), take 2×A ($60) → customer owes $15.
  const { data: ex, error: exErr } = await cashier.rpc("pos_exchange", {
    p_order_id: orderId,
    p_return_items: [{ order_item_id: itemB!.id, quantity: 1 }],
    p_new_items: [{ variant_id: A.variantId, quantity: 2 }],
    p_payments: [{ currency: "USD", amount_minor: 1500 }],
  });
  check("exchange (customer owes) succeeds", !exErr, exErr?.message);
  check("exchange credit $45.00", ex?.[0]?.credit_usd_cents === 4500, String(ex?.[0]?.credit_usd_cents));
  check("new order total $60.00", ex?.[0]?.new_total_usd_cents === 6000, String(ex?.[0]?.new_total_usd_cents));

  const newOrderId = ex?.[0]?.new_order_id;
  const { data: pays } = await svc.from("order_payments").select("method, usd_equiv_cents").eq("order_id", newOrderId);
  const creditPay = pays?.find((p) => p.method === "credit");
  const cashPay = pays?.find((p) => p.method === "cash");
  check("credit payment $45 on new order", creditPay?.usd_equiv_cents === 4500, String(creditPay?.usd_equiv_cents));
  check("cash payment $15 on new order", cashPay?.usd_equiv_cents === 1500, String(cashPay?.usd_equiv_cents));

  const { data: origAfterEx } = await svc.from("orders").select("status").eq("id", orderId).single();
  check("partially-returned original stays completed", origAfterEx?.status === "completed", origAfterEx?.status);

  const { data: lvlA2 } = await svc.from("inventory_levels").select("quantity").eq("variant_id", A.variantId).eq("branch_id", branch!.id).single();
  const { data: lvlB2 } = await svc.from("inventory_levels").select("quantity").eq("variant_id", B.variantId).eq("branch_id", branch!.id).single();
  check("A stock: 9 − 2 = 7", lvlA2?.quantity === 7, String(lvlA2?.quantity));
  check("B stock: 9 + 1 = 10", lvlB2?.quantity === 10, String(lvlB2?.quantity));

  // Exchange where WE owe: new sale of 1×B ($50 paid), swap for 1×A ($30) → refund $20.
  const { data: sale2 } = await cashier.rpc("pos_checkout", {
    p_branch_id: branch!.id,
    p_items: [{ variant_id: B.variantId, quantity: 1 }],
    p_payments: [{ currency: "USD", amount_minor: 5000 }],
  });
  const order2 = sale2?.[0]?.order_id;
  const { data: items2 } = await svc.from("order_items").select("id").eq("order_id", order2);
  const { data: ex2, error: ex2Err } = await cashier.rpc("pos_exchange", {
    p_order_id: order2,
    p_return_items: [{ order_item_id: items2![0].id, quantity: 1 }],
    p_new_items: [{ variant_id: A.variantId, quantity: 1 }],
    p_refunds: [{ currency: "LBP", amount_minor: 1_800_000 }], // $20 at 90k
  });
  check("exchange (we owe) succeeds", !ex2Err, ex2Err?.message);
  const { data: retPays } = await svc.from("order_return_payments").select("direction, usd_equiv_cents").eq("return_id", ex2?.[0]?.return_id);
  check("refund-out $20 recorded", retPays?.[0]?.direction === "out" && retPays?.[0]?.usd_equiv_cents === 2000, JSON.stringify(retPays));
  const { data: ord2After } = await svc.from("orders").select("status").eq("id", order2).single();
  check("fully-exchanged order flips to exchanged", ord2After?.status === "exchanged", ord2After?.status);

  // Anonymous blocked.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: anonErr } = await anon.rpc("pos_return", {
    p_order_id: orderId,
    p_items: [{ order_item_id: itemA!.id, quantity: 1 }],
    p_refunds: [{ currency: "USD", amount_minor: 2700 }],
  });
  check("anon return rejected", !!anonErr);

  // Cleanup.
  await svc.from("order_returns").delete().in("order_id", [orderId, order2]);
  await svc.from("orders").delete().in("id", [orderId, newOrderId, order2, ex2?.[0]?.new_order_id].filter(Boolean));
  await svc.from("inventory_movements").delete().in("variant_id", [A.variantId, B.variantId]);
  await svc.from("products").delete().in("id", [A.productId, B.productId]);

  console.log(failures ? `\n${failures} FAILURES` : "\nAll return/exchange checks passed.");
  process.exit(failures ? 1 : 0);
}

main();
