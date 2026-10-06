// Staff accounts (§8): the super admin creates staff sign-ins, sets their role,
// name and branch, resets passwords and switches accounts off/on — from MGMT.
// Creating auth users needs the service role, so it lives here, never in the
// browser. Every call is checked: the caller's JWT must belong to a super admin.
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ORIGINS = new Set(["https://mgmt.bachwears.com", "http://localhost:3002", "http://localhost:3000"]);
const ROLES = new Set(["super_admin", "store_manager", "inventory_manager", "cashier", "support_agent", "marketing_manager"]);
/** Switched-off accounts are banned for 100 years; switching on lifts it. */
const OFF = "876000h";

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://mgmt.bachwears.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function strongEnough(pw: string) {
  return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== "POST") return reply(405, { error: "method not allowed" });

  // who is calling: only a super admin gets past here
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  const callerId = who.user?.id;
  if (!callerId) return reply(401, { error: "sign in again" });
  const { data: caller } = await admin.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (caller?.role !== "super_admin") return reply(403, { error: "super admin only" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "bad request" });
  }
  const action = String(body.action ?? "");
  const id = typeof body.id === "string" ? body.id : "";

  // best effort: the log table may not exist yet on older databases
  const audit = async (what: string, target: string | null, detail: Record<string, unknown> = {}) => {
    await admin.from("staff_audit_log").insert({ actor_id: callerId, action: what, target_id: target, detail }).then(
      () => {},
      () => {},
    );
  };

  // never lock the shop out: the last active super admin stays a super admin
  const otherActiveSuperAdmins = async (exceptId: string) => {
    const { data } = await admin.from("profiles").select("id").eq("role", "super_admin").neq("id", exceptId);
    let n = 0;
    for (const p of data ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      const banned = u.user?.banned_until && new Date(u.user.banned_until) > new Date();
      if (!banned) n++;
    }
    return n;
  };

  if (action === "list") {
    const [{ data: profiles, error }, { data: branches }] = await Promise.all([
      admin.from("profiles").select("id, role, full_name, branch_id, must_change_password, pos_pin_hash, created_at").order("created_at"),
      admin.from("branches").select("id, name").order("name"),
    ]);
    if (error) return reply(500, { error: error.message });
    const users = new Map<string, { email?: string; last_sign_in_at?: string; banned_until?: string }>();
    for (let page = 1; page < 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of data?.users ?? []) users.set(u.id, u as never);
      if ((data?.users ?? []).length < 1000) break;
    }
    const staff = (profiles ?? []).map((p) => {
      const u = users.get(p.id) ?? {};
      return {
        id: p.id,
        email: u.email ?? "",
        full_name: p.full_name ?? "",
        role: p.role,
        branch_id: p.branch_id,
        must_change_password: p.must_change_password,
        has_pin: !!p.pos_pin_hash,
        last_sign_in_at: u.last_sign_in_at ?? null,
        active: !(u.banned_until && new Date(u.banned_until) > new Date()),
        created_at: p.created_at,
        is_me: p.id === callerId,
      };
    });
    return reply(200, { staff, branches: branches ?? [] });
  }

  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "");
    const branchId = typeof body.branch_id === "string" && body.branch_id ? body.branch_id : null;
    const password = String(body.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "invalid email" });
    if (!ROLES.has(role)) return reply(400, { error: "invalid role" });
    if (!fullName) return reply(400, { error: "name required" });
    if (!strongEnough(password)) return reply(400, { error: "weak password" });
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, staff: true },
    });
    if (error || !created.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      return reply(exists ? 409 : 500, { error: exists ? "email exists" : (error?.message ?? "create failed") });
    }
    const { error: pErr } = await admin.from("profiles").upsert({
      id: created.user.id,
      role,
      full_name: fullName,
      branch_id: branchId,
      must_change_password: true,
    });
    if (pErr) {
      // don't leave a sign-in without a staff profile behind
      await admin.auth.admin.deleteUser(created.user.id);
      return reply(500, { error: pErr.message });
    }
    await audit("create", created.user.id, { email, role, branch_id: branchId });
    return reply(200, { id: created.user.id });
  }

  if (!id) return reply(400, { error: "id required" });
  const { data: target } = await admin.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (!target) return reply(404, { error: "not found" });

  if (action === "update") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.full_name === "string") patch.full_name = body.full_name.trim();
    if ("branch_id" in body) patch.branch_id = typeof body.branch_id === "string" && body.branch_id ? body.branch_id : null;
    if (typeof body.role === "string") {
      if (!ROLES.has(body.role)) return reply(400, { error: "invalid role" });
      if (target.role === "super_admin" && body.role !== "super_admin" && (await otherActiveSuperAdmins(id)) === 0) {
        return reply(409, { error: "last super admin" });
      }
      patch.role = body.role;
    }
    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return reply(500, { error: error.message });
    await audit("update", id, patch);
    return reply(200, { ok: true });
  }

  if (action === "reset_password") {
    const password = String(body.password ?? "");
    if (!strongEnough(password)) return reply(400, { error: "weak password" });
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return reply(500, { error: error.message });
    // the temporary password must be changed at the next sign-in
    await admin.from("profiles").update({ must_change_password: true, updated_at: new Date().toISOString() }).eq("id", id);
    await audit("reset_password", id);
    return reply(200, { ok: true });
  }

  if (action === "set_active") {
    const active = body.active === true;
    if (!active && id === callerId) return reply(409, { error: "cannot switch yourself off" });
    if (!active && target.role === "super_admin" && (await otherActiveSuperAdmins(id)) === 0) {
      return reply(409, { error: "last super admin" });
    }
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : OFF });
    if (error) return reply(500, { error: error.message });
    await audit(active ? "activate" : "deactivate", id);
    return reply(200, { ok: true });
  }

  return reply(400, { error: "unknown action" });
});
