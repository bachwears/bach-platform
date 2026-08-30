/**
 * Seeds the six staff role accounts (role@bachwears.com) with a temporary
 * password and must_change_password=true, plus the first branch.
 *
 * Idempotent — safe to re-run; existing users are updated, not duplicated.
 *
 * Usage (never commit real values — repo is public):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_TEMP_PASSWORD=... \
 *     pnpm tsx scripts/seed-staff.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tempPassword = process.env.SEED_TEMP_PASSWORD;

if (!url || !serviceRoleKey || !tempPassword) {
  console.error(
    "Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_TEMP_PASSWORD are required.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF: Array<{ email: string; role: string; fullName: string }> = [
  { email: "superadmin@bachwears.com", role: "super_admin", fullName: "Super Admin" },
  { email: "storemanager@bachwears.com", role: "store_manager", fullName: "Store Manager" },
  { email: "inventorymanager@bachwears.com", role: "inventory_manager", fullName: "Inventory Manager" },
  { email: "cashier@bachwears.com", role: "cashier", fullName: "Cashier" },
  { email: "supportagent@bachwears.com", role: "support_agent", fullName: "Support Agent" },
  { email: "marketing@bachwears.com", role: "marketing_manager", fullName: "Marketing Manager" },
];

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
}

async function main() {
  // First branch (settings row for branch #2 comes later, per CLAUDE.md §3).
  const { data: existingBranch, error: branchReadError } = await admin
    .from("branches")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (branchReadError) throw branchReadError;

  let branchId = existingBranch?.id as string | undefined;
  if (!branchId) {
    const { data: branch, error } = await admin
      .from("branches")
      .insert({ name: "Main Branch", name_ar: "الفرع الرئيسي" })
      .select("id")
      .single();
    if (error) throw error;
    branchId = branch.id;
    console.log("Created Main Branch:", branchId);
  }

  for (const staff of STAFF) {
    let userId: string;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: staff.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError) {
      const existingId = await findUserIdByEmail(staff.email);
      if (!existingId) throw createError;
      userId = existingId;
      console.log(`exists  ${staff.email}`);
    } else {
      userId = created.user.id;
      console.log(`created ${staff.email}`);
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      role: staff.role,
      full_name: staff.fullName,
      branch_id: branchId,
      must_change_password: true,
    });
    if (profileError) throw profileError;
  }

  console.log("Seed complete: 6 staff accounts, forced password change on first login.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
