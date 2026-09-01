"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";

const KIND_META: Record<string, { icon: string; note: string }> = {
  cash: { icon: "💵", note: "كاش بالمحل — الكاشير." },
  cod: { icon: "🚚", note: "الدفع عند الاستلام للطلبات الأونلاين." },
  whish: { icon: "📱", note: "ويش موني — جاهز للتفعيل لما يجهز الحساب." },
  stripe: { icon: "💳", note: "فيزا/ماستركارد عبر Stripe — التكامل جاهز بالكامل؛ التفعيل = مفاتيح + هالزر، بلا أي تعديل كود. بانتظار السجل التجاري." },
};

interface Method {
  id: string;
  kind: string;
  display_name_en: string;
  display_name_ar: string;
  is_enabled: boolean;
}

export function PaymentsConfig() {
  const supabase = supabaseBrowser();
  const [methods, setMethods] = useState<Method[]>([]);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("kind");
    setMethods((data ?? []) as unknown as Method[]);
  }, [supabase]);

  useEffect(() => {
    void load();
    // Ask the checkout function whether Stripe keys exist (503 = dormant).
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    })
      .then((r) => setStripeReady(r.status !== 503))
      .catch(() => setStripeReady(null));
  }, [load]);

  async function toggle(m: Method) {
    if (m.kind === "stripe" && !m.is_enabled && stripeReady === false) {
      setError("مفاتيح Stripe مش محطوطة بعد — حط المفاتيح بالـsecrets وبعدين فعّل.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase
      .from("payment_methods")
      .update({ is_enabled: !m.is_enabled, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    setBusy(false);
    if (err) setError(`ما مشي التغيير: ${err.message}`);
    else void load();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      {methods.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{KIND_META[m.kind]?.icon}</span>
            <div>
              <p className="font-medium">
                {m.display_name_ar} <span className="text-sm text-muted-foreground" dir="ltr">· {m.display_name_en}</span>
              </p>
              <p className="mt-0.5 max-w-md text-sm text-muted-foreground">{KIND_META[m.kind]?.note}</p>
              {m.kind === "stripe" && (
                <p className="mt-1 text-xs">
                  {stripeReady === null ? (
                    <span className="text-muted-foreground">عم نفحص المفاتيح…</span>
                  ) : stripeReady ? (
                    <span className="text-green-600 dark:text-green-400">المفاتيح موجودة — جاهز للتفعيل.</span>
                  ) : (
                    <span className="text-muted-foreground">نايم (dormant) — ما في مفاتيح بعد.</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={m.is_enabled ? "default" : "secondary"}>{m.is_enabled ? "شغّال" : "مطفّي"}</Badge>
            <Button size="sm" variant={m.is_enabled ? "outline" : "default"} disabled={busy} onClick={() => void toggle(m)}>
              {m.is_enabled ? "طفّي" : "فعّل"}
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        تفعيل Stripe لاحقاً: <span dir="ltr" className="font-mono">supabase secrets set STRIPE_SECRET_KEY=sk_live_… STRIPE_WEBHOOK_SECRET=whsec_…</span> وبعدين كبسة "فعّل" — بلا أي نشر جديد.
      </p>
    </div>
  );
}
