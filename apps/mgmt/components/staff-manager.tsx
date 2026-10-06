"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";

import { fmt } from "../lib/time";
import { EmptyState } from "@bach/ui/components/empty-state";

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

/** What each role can do — the same rules the database and the menus apply. */
export const ROLE_CAN: Record<string, string[]> = {
  super_admin: ["كل شي بالإدارة والكاشير", "الموظفين وصلاحياتهم", "الدفع والإعدادات"],
  store_manager: [
    "الكاشير: بيع، مرتجع، تبديل، خصم فوق 10%، تقرير آخر النهار",
    "الطلبات والزبائن والمرتجعات والشكاوى",
    "المنتجات والصور والتسويق والمحتوى",
    "المخزون والمشتريات والتحويل والليبلات",
    "التقارير والتحليلات",
  ],
  inventory_manager: ["المخزون والمشتريات والتحويل بين الفروع", "المقاسات والليبلات", "الجرد بالكاشير (عدّ واعتماد)"],
  cashier: ["الكاشير: بيع، مرتجع، تبديل، خصم لحد 10%", "طلبات الأونلاين بالكاشير", "الجرد (عدّ بس)", "الطلبات والزبائن والمرتجعات بالإدارة (قراءة وخدمة)"],
  support_agent: ["الطلبات والزبائن والمرتجعات والشكاوى", "طلبات الأونلاين بالكاشير (بلا بيع)"],
  marketing_manager: ["المنتجات والصور والفئات والكولكشنات", "الحملات والعروض ومحتوى الموقع", "مقالات المساعدة والتحليلات"],
};

interface Staff {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branch_id: string | null;
  must_change_password: boolean;
  has_pin: boolean;
  last_sign_in_at: string | null;
  active: boolean;
  is_me: boolean;
}

const ERRORS: Record<string, string> = {
  "invalid email": "الإيميل مش مزبوط.",
  "invalid role": "اختار دور.",
  "name required": "اكتب الاسم.",
  "weak password": "كلمة السر لازم تكون 8 أحرف عالأقل، فيها أحرف وأرقام.",
  "email exists": "في حساب بهالإيميل من قبل.",
  "last super admin": "هيدا آخر سوبر أدمن شغّال — لازم يضل في واحد عالأقل.",
  "cannot switch yourself off": "ما فيك توقّف حسابك إنت.",
  "super admin only": "هالشاشة للسوبر أدمن بس.",
  "sign in again": "انتهت الجلسة — فوت من جديد.",
};

/** A readable temporary password: letters + digits, no look-alikes. */
function tempPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz";
  const d = "23456789";
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0]! % s.length];
  return `Bach-${Array.from({ length: 4 }, () => pick(a)).join("")}${Array.from({ length: 4 }, () => pick(d)).join("")}`;
}

async function call(body: Record<string, unknown>) {
  const sb = supabaseBrowser();
  const { data: s } = await sb.auth.getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/staff-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.session?.access_token ?? ""}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(ERRORS[String(json.error)] ?? String(json.error ?? `خطأ ${res.status}`));
  return json;
}

export function StaffManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // the password shown once, right after creating or resetting
  const [shown, setShown] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ email: "", full_name: "", role: "cashier", branch_id: "", password: tempPassword() });

  const load = useCallback(async () => {
    try {
      const r = (await call({ action: "list" })) as { staff: Staff[]; branches: Array<{ id: string; name: string }> };
      setStaff(r.staff);
      setBranches(r.branches);
      setForm((f) => (f.branch_id ? f : { ...f, branch_id: r.branches[0]?.id ?? "" }));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, body: Record<string, unknown>, after?: () => void) {
    setBusy(true);
    setMsg(null);
    try {
      await call(body);
      after?.();
      setMsg({ ok: true, text: label });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(false);
  }

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</p>}
      {shown && (
        <div className="space-y-1 border p-4 text-sm">
          <p className="font-medium">بلّغ الموظف بمعلومات الدخول (بتبيّن هلّق بس):</p>
          <p dir="ltr" className="font-mono">
            {shown.email} · {shown.password}
          </p>
          <p className="text-xs text-muted-foreground">أوّل ما يفوت، البرنامج بيطلب منو يغيّر كلمة السر.</p>
          <button type="button" className="text-xs underline underline-offset-4" onClick={() => setShown(null)}>
            خبّي المعلومات
          </button>
        </div>
      )}

      {/* New account */}
      <section id="new-staff" className="scroll-mt-6 space-y-4 border p-4">
        <h2 className="font-medium">حساب موظف جديد</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="st-name">الاسم</Label>
            <Input id="st-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-email">الإيميل (للدخول)</Label>
            <Input
              id="st-email"
              dir="ltr"
              type="email"
              placeholder="name@bachwears.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-role">الدور</Label>
            <select
              id="st-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-10 border bg-transparent px-2 text-sm"
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-branch">الفرع</Label>
            <select
              id="st-branch"
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className="h-10 border bg-transparent px-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="st-pw">كلمة سر مؤقتة</Label>
            <div className="flex gap-2">
              <Input id="st-pw" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: tempPassword() })}>
                ولّد وحدة تانية
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">شو بيقدر يعمل «{ROLE_LABELS[form.role]}»:</p>
          <ul className="list-inside list-disc">
            {(ROLE_CAN[form.role] ?? []).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <Button
          disabled={busy || !form.email || !form.full_name}
          onClick={() =>
            void run("انعمل الحساب.", { action: "create", ...form }, () => {
              setShown({ email: form.email.trim().toLowerCase(), password: form.password });
              setForm({ ...form, email: "", full_name: "", password: tempPassword() });
            })
          }
        >
          {busy ? "لحظة…" : "اعمل الحساب"}
        </Button>
      </section>

      {/* Accounts */}
      <section className="space-y-3">
        <h2 className="font-medium">الحسابات ({staff.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">عم نحمّل الحسابات…</p>
        ) : staff.length === 0 ? (
          <EmptyState icon="staff" title="ما في حسابات بعد — اعمل أول حساب من «حساب موظف جديد» فوق." />
        ) : (
          <ul className="divide-y border">
            {staff.map((s) => (
              <li key={s.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {s.full_name || "—"} {s.is_me && <span className="text-xs text-muted-foreground">(إنت)</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground" dir="ltr">
                      {s.email}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{ROLE_LABELS[s.role] ?? s.role}</Badge>
                      <span className="text-muted-foreground">{branchName(s.branch_id)}</span>
                      {!s.active && <Badge variant="destructive">موقّف</Badge>}
                      {s.must_change_password && <span className="text-amber-700 dark:text-amber-400">لازم يغيّر كلمة السر</span>}
                      {s.has_pin && <span className="text-muted-foreground">عندو PIN للكاشير</span>}
                      <span className="text-muted-foreground">
                        آخر دخول: {s.last_sign_in_at ? fmt(new Date(s.last_sign_in_at)) : "ولا مرّة"}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                    {editing === s.id ? "سكّر التعديل" : "عدّل"}
                  </Button>
                </div>
                {editing === s.id && <StaffEdit s={s} branches={branches} busy={busy} run={run} onShow={setShown} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StaffEdit({
  s,
  branches,
  busy,
  run,
  onShow,
}: {
  s: Staff;
  branches: Array<{ id: string; name: string }>;
  busy: boolean;
  run: (label: string, body: Record<string, unknown>, after?: () => void) => Promise<void>;
  onShow: (v: { email: string; password: string }) => void;
}) {
  const [v, setV] = useState({ full_name: s.full_name, role: s.role, branch_id: s.branch_id ?? "" });
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`se-name-${s.id}`}>الاسم</Label>
          <Input id={`se-name-${s.id}`} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`se-role-${s.id}`}>الدور</Label>
          <select
            id={`se-role-${s.id}`}
            value={v.role}
            onChange={(e) => setV({ ...v, role: e.target.value })}
            className="h-10 border bg-transparent px-2 text-sm"
          >
            {Object.entries(ROLE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`se-branch-${s.id}`}>الفرع</Label>
          <select
            id={`se-branch-${s.id}`}
            value={v.branch_id}
            onChange={(e) => setV({ ...v, branch_id: e.target.value })}
            className="h-10 border bg-transparent px-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {v.role !== s.role && (
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {(ROLE_CAN[v.role] ?? []).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void run("انحفظ.", { action: "update", id: s.id, ...v })}>
          احفظ التعديلات
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const password = tempPassword();
            if (!window.confirm(`تعيين كلمة سر مؤقتة جديدة لـ ${s.email}؟ القديمة بتوقف.`)) return;
            void run("تغيّرت كلمة السر.", { action: "reset_password", id: s.id, password }, () => onShow({ email: s.email, password }));
          }}
        >
          كلمة سر مؤقتة جديدة
        </Button>
        {!s.is_me && (
          <Button
            size="sm"
            variant={s.active ? "outline" : "default"}
            disabled={busy}
            onClick={() => {
              if (s.active && !window.confirm(`توقيف حساب ${s.email}؟ ما بقى فيه يفوت لحتى ترجّع تشغّلو.`)) return;
              void run(s.active ? "انوقف الحساب." : "رجع الحساب شغّال.", { action: "set_active", id: s.id, active: !s.active });
            }}
          >
            {s.active ? "وقّف الحساب" : "شغّل الحساب"}
          </Button>
        )}
      </div>
    </div>
  );
}
