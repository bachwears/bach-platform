"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { HintDot } from "@bach/ui/components/hint-dot";

import { NOT_SAVED } from "../lib/access";
import { Icon } from "@bach/ui/components/icon";

// Same shape the database accepts in _admin_notify_email(); anything else is ignored there.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Events that also email the admin address (notification_log trigger, admin_* templates). */
const ADMIN_EVENTS: Array<{ label: string; link: string }> = [
  { label: "طلب أونلاين جديد", link: "رابط الطلب بالإدارة" },
  { label: "طلب إرجاع أو تبديل جديد", link: "صفحة المرتجعات" },
  { label: "شكوى جديدة", link: "صفحة الشكاوى" },
];

/**
 * MGMT card for site_content 'notify': the shop/admin address that receives an
 * internal email for every shop notification (the WhatsApp copy stays skipped
 * until Twilio is live). Leaving it empty stops those emails.
 */
export function NotificationSettings() {
  const supabase = supabaseBrowser();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabase
      .from("site_content")
      .select("value")
      .eq("key", "notify")
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value ?? {}) as { admin_email?: string };
        setEmail(v.admin_email ?? "");
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg("");
    setErr("");
    const value = email.trim().toLowerCase();
    if (value && (!EMAIL_RE.test(value) || value.length > 254)) {
      return setErr("الإيميل مش مزبوط — اكتبو متل name@example.com، أو فضّيه لتوقّف إيميلات الإدارة.");
    }
    setBusy(true);
    const { data: changed, error } = await supabase
      .from("site_content")
      .upsert({ key: "notify", value: { admin_email: value }, updated_at: new Date().toISOString() })
      .select("key");
    setBusy(false);
    if (error) setErr(`ما مشي الحفظ: ${error.message}`);
    else if (!changed?.length) setErr(NOT_SAVED);
    else {
      setEmail(value);
      setMsg(value ? `انحفظ — التنبيهات الجاية بتوصل على ${value}.` : "انحفظ — إيميلات الإدارة موقّفة لحتى تحط إيميل.");
    }
  }

  return (
    <section className="border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        <Icon name="email" size={18} className="text-muted-foreground" />
        تنبيهات الإدارة بالإيميل
        <HintDot
          hint={{
            title: "إيميل الإدارة",
            what: "كل تنبيه بيوصل للمحل (طلب أونلاين جديد، طلب إرجاع أو تبديل، شكوى) بيوصل كمان كإيميل داخلي قصير على هالعنوان، فيه رقم الطلب أو التذكرة ورابط مباشر عالإدارة. الواتساب للمحل بيضل موقّف لحتى يتفعّل Twilio.",
            source: "العنوان محفوظ بجدول site_content (مفتاح notify)؛ الإيميلات بتنبعت من noreply@bachwears.com بنفس تصميم إيميلات BACH.",
            edit: "من هون (سوبر أدمن، مدير محل، مدير تسويق). نص الإيميلات بجدول notification_templates (أحداث admin_…).",
          }}
        />
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">إيميل واحد بيستلم تنبيهات المحل — فضّيه إذا بدك توقّفها.</p>

      {!loaded ? (
        <p className="mt-3 text-sm text-muted-foreground">عم نحمّل…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-1.5 sm:max-w-md">
            <Label htmlFor="notify-admin-email">إيميل الإدارة</Label>
            <Input
              id="notify-admin-email"
              type="email"
              dir="ltr"
              autoComplete="off"
              className="text-left"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="text-sm">
            <p className="font-medium">شو بيوصل عليه</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5 text-muted-foreground">
              {ADMIN_EVENTS.map((e) => (
                <li key={e.label}>
                  {e.label} <span className="text-xs">— مع {e.link}</span>
                </li>
              ))}
            </ul>
          </div>
          {err && <p className="bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
          {msg && <p className="bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
          <Button size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? "عم نحفظ…" : "احفظ إيميل الإدارة"}
          </Button>
        </div>
      )}
    </section>
  );
}
