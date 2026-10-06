"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";

/**
 * Returns policy (site_content 'returns'): days to return, days to exchange —
 * counted from when the customer received the order — and the delivery fee
 * kept on returns/exchanges of online deliveries. The website, the POS and the
 * database all read these numbers. The written policy pages are edited in
 * Site content.
 */
export function ReturnsPolicySettings({ canEdit }: { canEdit: boolean }) {
  const [v, setV] = useState({ return_days: "3", exchange_days: "7", fee: "5" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void supabaseBrowser()
      .from("site_content")
      .select("value")
      .eq("key", "returns")
      .maybeSingle()
      .then(({ data }) => {
        const r = (data?.value ?? {}) as { return_days?: number; exchange_days?: number; fee_usd_cents?: number };
        setV({
          return_days: String(r.return_days ?? 3),
          exchange_days: String(r.exchange_days ?? 7),
          fee: String((r.fee_usd_cents ?? 500) / 100),
        });
        setLoaded(true);
      });
  }, []);

  async function save() {
    const rd = parseInt(v.return_days, 10);
    const ed = parseInt(v.exchange_days, 10);
    const fee = Math.round(parseFloat(v.fee) * 100);
    if (!(rd >= 0 && rd <= 365 && ed >= 0 && ed <= 365 && fee >= 0 && fee <= 100000)) {
      setMsg({ ok: false, text: "أرقام مش مزبوطة — الأيام بين 0 و365، والرسوم مبلغ بالدولار." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser()
      .from("site_content")
      .upsert({ key: "returns", value: { return_days: rd, exchange_days: ed, fee_usd_cents: fee }, updated_at: new Date().toISOString() });
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: `ما انحفظ: ${error.message}` }
        : { ok: true, text: "انحفظ — بيمشي فوراً عالموقع والكاشير. ما تنسى تعدّل نص صفحة الإرجاع إذا تغيّرت الأرقام." },
    );
  }

  return (
    <section className="space-y-4 border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        سياسة الإرجاع
        <HintDot
          hint={{
            title: "سياسة الإرجاع والتبديل",
            what: "كم يوم عند الزبون ليرجّع أو يبدّل، من يوم ما استلم الطلب (الأونلاين: يوم التوصيل؛ المحل: يوم البيعة)، وكم رسوم توصيل بتنحسب على إرجاع أو تبديل طلب انوصل.",
            source: "جدول site_content (مفتاح returns). الموقع والكاشير وقاعدة البيانات بيقروا منو.",
            edit: "من هون. نص صفحة الإرجاع وشروط البيع بيتعدّل من «محتوى الموقع».",
          }}
        />
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rp-r">أيام الإرجاع</Label>
          <Input id="rp-r" inputMode="numeric" dir="ltr" value={v.return_days} disabled={!canEdit} onChange={(e) => setV({ ...v, return_days: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rp-e">أيام التبديل</Label>
          <Input id="rp-e" inputMode="numeric" dir="ltr" value={v.exchange_days} disabled={!canEdit} onChange={(e) => setV({ ...v, exchange_days: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rp-f">رسوم التوصيل ($)</Label>
          <Input id="rp-f" inputMode="decimal" dir="ltr" value={v.fee} disabled={!canEdit} onChange={(e) => setV({ ...v, fee: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        بعد المهلة الكاشير ما فيه يسجّل الإرجاع — المدير فيه كاستثناء. المدير كمان فيه يعفي من الرسوم إذا الزبون رجّع القطعة عالمحل.
      </p>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={busy || !loaded} onClick={() => void save()}>
            {busy ? "عم نحفظ…" : "احفظ السياسة"}
          </Button>
          {msg && <span role="status" className={`text-xs ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">التعديل للسوبر أدمن، مدير المحل أو مسؤول التسويق.</p>
      )}
    </section>
  );
}
