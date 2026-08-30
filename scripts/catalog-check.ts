/**
 * Catalog + inventory verification (§13 tests: SKU generation, inventory
 * movements, catalog RLS). Run against local or prod-like env:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANON_KEY=... \
 *     SEED_TEMP_PASSWORD=... pnpm tsx scripts/catalog-check.ts
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
  const { data: cat } = await svc.from("categories").select("id").eq("code", "SH").single();
  const { data: branch } = await svc.from("branches").select("id").limit(1).single();

  // published + draft test products
  const { data: pub } = await svc
    .from("products")
    .insert({
      slug: `test-pub-${run}`, name_en: "Test Pub", name_ar: "تجربة",
      category_id: cat!.id, price_usd_cents: 5000, status: "published",
    })
    .select("id").single();
  const { data: draft } = await svc
    .from("products")
    .insert({
      slug: `test-draft-${run}`, name_en: "Test Draft", name_ar: "مسودة",
      category_id: cat!.id, price_usd_cents: 5000, status: "draft",
    })
    .select("id").single();

  // 1. SKU auto-generation
  const { data: v1 } = await svc
    .from("product_variants")
    .insert({ product_id: pub!.id, size: "M", color_code: "NVY", color_en: "Navy", color_ar: "كحلي" })
    .select("sku, barcode").single();
  const { data: v2 } = await svc
    .from("product_variants")
    .insert({ product_id: pub!.id, size: "XL", color_code: "WHT", color_en: "White", color_ar: "أبيض" })
    .select("sku").single();

  check("SKU format", /^BW-SH-\d{4}-MNVY$/.test(v1!.sku), v1!.sku);
  check("SKU sequential/unique", /^BW-SH-\d{4}-XLWHT$/.test(v2!.sku) && v1!.sku !== v2!.sku, v2!.sku);
  check("barcode defaults to SKU", v1!.barcode === v1!.sku);

  // 2. manual SKU override respected
  const { data: v3 } = await svc
    .from("product_variants")
    .insert({
      product_id: pub!.id, size: "L", color_code: "BLK", color_en: "Black", color_ar: "أسود",
      sku: `CUSTOM-${run}`,
    })
    .select("sku").single();
  check("manual SKU override", v3!.sku === `CUSTOM-${run}`);

  // 3. movements drive levels; negative stock rejected
  const vid = (await svc.from("product_variants").select("id").eq("sku", v1!.sku).single()).data!.id;
  await svc.from("inventory_movements").insert({ variant_id: vid, branch_id: branch!.id, delta: 10, reason: "purchase" });
  await svc.from("inventory_movements").insert({ variant_id: vid, branch_id: branch!.id, delta: -4, reason: "sale" });
  const { data: lvl } = await svc
    .from("inventory_levels").select("quantity")
    .eq("variant_id", vid).eq("branch_id", branch!.id).single();
  check("movements update level (10-4=6)", lvl?.quantity === 6, `qty=${lvl?.quantity}`);

  const neg = await svc
    .from("inventory_movements")
    .insert({ variant_id: vid, branch_id: branch!.id, delta: -100, reason: "sale" });
  check("negative stock rejected", !!neg.error, neg.error?.code ?? "no error");

  // 4. anon sees published only
  const anon = createClient(URL, ANON);
  const { data: anonProducts } = await anon.from("products").select("slug").like("slug", `test-%-${run}`);
  check(
    "anon sees published, not draft",
    anonProducts?.length === 1 && anonProducts[0]!.slug === `test-pub-${run}`,
    JSON.stringify(anonProducts?.map((p) => p.slug)),
  );

  // 5. cashier: staff read of drafts; no catalog writes; CAN record a sale
  const cashier = createClient(URL, ANON);
  const cl = await cashier.auth.signInWithPassword({ email: "cashier@bachwears.com", password: PASS });
  check("cashier login", !cl.error, cl.error?.message ?? "");
  const { data: cashierSees } = await cashier.from("products").select("slug").like("slug", `test-%-${run}`);
  check("cashier sees draft too", cashierSees?.length === 2, `rows=${cashierSees?.length}`);
  const cWrite = await cashier.from("products").insert({
    slug: `test-cashier-${run}`, name_en: "x", name_ar: "x", category_id: cat!.id, price_usd_cents: 1,
  });
  check("cashier cannot write products", !!cWrite.error, cWrite.error?.code ?? "no error");
  const cashierId = (await cashier.auth.getUser()).data.user!.id;
  const cSale = await cashier.from("inventory_movements").insert({
    variant_id: vid, branch_id: branch!.id, delta: -1, reason: "sale", created_by: cashierId,
  });
  check("cashier records sale movement", !cSale.error, cSale.error?.message ?? "");

  // 6. marketing manager can edit catalog
  const mkt = createClient(URL, ANON);
  await mkt.auth.signInWithPassword({ email: "marketing@bachwears.com", password: PASS });
  const mUpdate = await mkt.from("products").update({ name_en: "Renamed" }).eq("id", draft!.id).select();
  check("marketing updates product", mUpdate.data?.length === 1, mUpdate.error?.message ?? "");

  // cleanup (movements have no cascade — delete them first)
  await svc.from("inventory_movements").delete().eq("variant_id", vid);
  await svc.from("products").delete().in("id", [pub!.id, draft!.id]);

  console.log(failures === 0 ? "\nALL CATALOG CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("catalog-check crashed:", e.message ?? e);
  process.exit(1);
});
