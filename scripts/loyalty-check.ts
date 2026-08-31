/**
 * Birthday & loyalty engine verification (§13: birthday promo logic, loyalty math).
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANON_KEY=... pnpm tsx scripts/loyalty-check.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.ANON_KEY!;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const EMAIL = `bday-${run}@test.dev`;
const PHONE = `+9617${String(Date.now()).slice(-7)}`;

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { data: branch } = await svc.from("branches").select("id").limit(1).single();
  const { data: cat } = await svc.from("categories").select("id").limit(1).single();
  await svc.from("exchange_rates").insert({ lbp_per_usd: 90000 });

  const { data: prod } = await svc
    .from("products")
    .insert({ name_en: `Bday ${run}`, name_ar: `عيد ${run}`, slug: `bday-${run}`, category_id: cat!.id, price_usd_cents: 10000, status: "published" })
    .select("id")
    .single();
  const { data: variant } = await svc
    .from("product_variants")
    .insert({ product_id: prod!.id, size: "L", color_code: "BLK", color_en: "Black", color_ar: "أسود" })
    .select("id")
    .single();
  await svc.from("inventory_movements").insert({ variant_id: variant!.id, branch_id: branch!.id, delta: 10, reason: "purchase" });

  // Auth user + linked customer with birthday today (25 years ago), consented.
  const { data: authUser } = await svc.auth.admin.createUser({ email: EMAIL, password: "Passw0rd!abc", email_confirm: true });
  const today = new Date();
  const bday = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  const { data: cust } = await svc
    .from("customers")
    .insert({ full_name: "Bday Tester", phone: PHONE, email: EMAIL, auth_user_id: authUser!.user!.id, birthday: iso(bday), marketing_consent: true })
    .select("id")
    .single();

  const me = createClient(URL, ANON, { auth: { persistSession: false } });
  const login = await me.auth.signInWithPassword({ email: EMAIL, password: "Passw0rd!abc" });
  check("loyal customer signs in", !login.error, login.error?.message);

  // Popup helper.
  const { data: offer } = await me.rpc("my_birthday_offer");
  check("popup: in window, not used", offer?.[0]?.in_window === true && offer?.[0]?.already_used === false, JSON.stringify(offer?.[0]));
  check("popup: 15% code exposed", offer?.[0]?.code === "mybirthday" && offer?.[0]?.percent === 15);

  // Validation.
  const { data: val } = await me.rpc("validate_promocode", { p_code: "MYBIRTHDAY" });
  check("validate: birthday code valid (case-insensitive)", val?.[0]?.valid === true, val?.[0]?.message);

  // Guest cannot use it.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: valAnon } = await anon.rpc("validate_promocode", { p_code: "mybirthday" });
  check("guest rejected", valAnon?.[0]?.valid === false && valAnon?.[0]?.message?.includes("sign in"));

  // Checkout with the code: $100 item → 15% → $85.
  const { data: ord, error: ordErr } = await me.rpc("storefront_checkout", {
    p_items: [{ variant_id: variant!.id, quantity: 1 }],
    p_name: "Bday Tester",
    p_phone: PHONE,
    p_city: "Beirut",
    p_address: "st",
    p_promocode: "mybirthday",
  });
  check("checkout with birthday code succeeds", !ordErr, ordErr?.message);
  check("discount $15.00 returned", ord?.[0]?.discount_usd_cents === 1500, String(ord?.[0]?.discount_usd_cents));

  const { data: o } = await svc.from("orders").select("customer_id, discount_usd_cents, total_usd_cents").eq("id", ord?.[0]?.order_id).single();
  check("order total $85.00", o?.total_usd_cents === 8500, String(o?.total_usd_cents));
  check("order attached to auth customer", o?.customer_id === cust!.id);

  const { data: red } = await svc.from("promocode_redemptions").select("redemption_year").eq("customer_id", cust!.id);
  check("redemption recorded", red?.length === 1 && red[0].redemption_year === today.getFullYear());

  // Second use this year → blocked.
  const { data: val2 } = await me.rpc("validate_promocode", { p_code: "mybirthday" });
  check("second use blocked", val2?.[0]?.valid === false && val2?.[0]?.message?.includes("already"));
  const { data: offer2 } = await me.rpc("my_birthday_offer");
  check("popup reflects already_used", offer2?.[0]?.already_used === true);

  // Outside window: shift birthday 2 months (as staff via service role).
  const far = new Date(today.getFullYear() - 30, (today.getMonth() + 2) % 12, 15);
  await svc.from("customers").update({ birthday: iso(far) }).eq("id", cust!.id);
  await svc.from("promocode_redemptions").delete().eq("customer_id", cust!.id);
  const { data: val3 } = await me.rpc("validate_promocode", { p_code: "mybirthday" });
  check("outside window rejected", val3?.[0]?.valid === false && val3?.[0]?.message?.includes("birthday"), val3?.[0]?.message);

  // Customer cannot change an already-set birthday themselves.
  const { error: bdayErr } = await me.from("customers").update({ birthday: iso(bday) }).eq("id", cust!.id).select();
  check("self birthday change blocked", !!bdayErr, bdayErr?.message?.slice(0, 50));
  // …but consent toggle works.
  const { error: consentErr } = await me.from("customers").update({ marketing_consent: false }).eq("id", cust!.id);
  check("consent toggle allowed", !consentErr, consentErr?.message);
  await svc.from("customers").update({ marketing_consent: true, birthday: iso(bday) }).eq("id", cust!.id);

  // Notification sweep: birthday today + consent → enqueues.
  const { data: n1 } = await svc.rpc("enqueue_birthday_notifications");
  check("sweep enqueues for today's birthday", (n1 ?? 0) >= 1, String(n1));
  const { data: logs } = await svc.from("notification_log").select("event, channel").eq("recipient", PHONE);
  check("whatsapp birthday_today queued", (logs ?? []).some((l) => l.event === "birthday_today" && l.channel === "whatsapp"));
  // Re-run same day → no duplicates.
  const { data: n2 } = await svc.rpc("enqueue_birthday_notifications");
  const { data: logs2 } = await svc.from("notification_log").select("id").eq("recipient", PHONE);
  check("sweep is idempotent per day", logs2?.length === logs?.length, `${logs?.length} -> ${logs2?.length}`);

  // Without consent → nothing.
  await svc.from("customers").update({ marketing_consent: false }).eq("id", cust!.id);
  await svc.from("notification_log").delete().eq("recipient", PHONE);
  const { data: n3 } = await svc.rpc("enqueue_birthday_notifications");
  const { data: logs3 } = await svc.from("notification_log").select("id").eq("recipient", PHONE);
  check("no consent → no birthday messages", (logs3 ?? []).length === 0, String(n3));

  // Cleanup.
  await svc.from("promocode_redemptions").delete().eq("customer_id", cust!.id);
  await svc.from("orders").delete().eq("customer_id", cust!.id);
  await svc.from("customers").delete().eq("id", cust!.id);
  await svc.auth.admin.deleteUser(authUser!.user!.id);
  await svc.from("inventory_movements").delete().eq("variant_id", variant!.id);
  await svc.from("products").delete().eq("id", prod!.id);
  await svc.from("notification_log").delete().eq("recipient", PHONE);

  console.log(failures ? `\n${failures} FAILURES` : "\nAll loyalty checks passed.");
  process.exit(failures ? 1 : 0);
}

main();
