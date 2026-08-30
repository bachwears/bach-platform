import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY!;
const PASS = process.env.SEED_TEMP_PASSWORD!;

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  if (!ok) failures++;
}

async function main() {
  // 1. anon sees only enabled payment methods
  const anon = createClient(URL, ANON);
  const pmAnon = await anon.from("payment_methods").select("kind,is_enabled");
  check(
    "anon payment_methods",
    (pmAnon.data ?? []).length === 2 && (pmAnon.data ?? []).every((r) => r.is_enabled),
    `got ${JSON.stringify(pmAnon.data?.map((r) => r.kind))}`,
  );

  // 2. anon cannot read profiles or tva_settings
  const profAnon = await anon.from("profiles").select("id");
  check("anon profiles blocked", (profAnon.data ?? []).length === 0, `rows=${profAnon.data?.length}`);
  const tvaAnon = await anon.from("tva_settings").select("*");
  check("anon tva blocked", (tvaAnon.data ?? []).length === 0, `rows=${tvaAnon.data?.length}`);

  // 3. cashier
  const cashier = createClient(URL, ANON);
  const cLogin = await cashier.auth.signInWithPassword({ email: "cashier@bachwears.com", password: PASS });
  check("cashier login", !cLogin.error, cLogin.error?.message ?? "ok");

  const pmCashier = await cashier.from("payment_methods").select("kind");
  check("cashier sees enabled methods only", (pmCashier.data ?? []).length === 2, `rows=${pmCashier.data?.length}`);

  const profCashier = await cashier.from("profiles").select("role");
  check(
    "cashier sees only own profile",
    (profCashier.data ?? []).length === 1 && profCashier.data?.[0]?.role === "cashier",
    JSON.stringify(profCashier.data),
  );

  const tvaRead = await cashier.from("tva_settings").select("enabled");
  check("cashier reads tva settings", (tvaRead.data ?? []).length === 1, `rows=${tvaRead.data?.length}`);

  const tvaWrite = await cashier.from("tva_settings").update({ enabled: true }).eq("id", true).select();
  check("cashier CANNOT update tva", (tvaWrite.data ?? []).length === 0, `updated=${tvaWrite.data?.length}`);

  const rateWrite = await cashier.from("exchange_rates").insert({ lbp_per_usd: 90000 }).select();
  check("cashier CANNOT set exchange rate", !!rateWrite.error || (rateWrite.data ?? []).length === 0, rateWrite.error?.code ?? "no error");

  // 4. super admin
  const admin = createClient(URL, ANON);
  const aLogin = await admin.auth.signInWithPassword({ email: "superadmin@bachwears.com", password: PASS });
  check("superadmin login", !aLogin.error, aLogin.error?.message ?? "ok");

  const pmAdmin = await admin.from("payment_methods").select("kind");
  check("superadmin sees all 4 methods", (pmAdmin.data ?? []).length === 4, `rows=${pmAdmin.data?.length}`);

  const profAdmin = await admin.from("profiles").select("role");
  check("superadmin sees all 6 profiles", (profAdmin.data ?? []).length === 6, `rows=${profAdmin.data?.length}`);

  const rateAdmin = await admin.from("exchange_rates").insert({ lbp_per_usd: 89500 }).select();
  check("superadmin CAN set exchange rate", (rateAdmin.data ?? []).length === 1, rateAdmin.error?.message ?? "ok");

  console.log(failures === 0 ? "\nALL RLS CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
