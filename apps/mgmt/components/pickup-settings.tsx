"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Icon } from "@bach/ui/components/icon";

interface Pickup {
  enabled: boolean;
  address: string;
  hours: string;
  pay_note: string;
  /** Google Maps link to the shop; bachwears.com/visit redirects to it */
  map_url: string;
}

const DEFAULTS: Pickup = {
  enabled: true,
  address: "",
  hours: "Every day 10:00–19:00",
  pay_note: "Pay at the shop — cash or Whish",
  map_url: "",
};

/**
 * Free pickup from the shop (site_content 'pickup'). The storefront offers the
 * choice only while it's on AND an address is filled in; the texts show on the
 * English storefront, so they stay in English.
 */
export function PickupSettings({ canEdit }: { canEdit: boolean }) {
  const [v, setV] = useState<Pickup>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void supabaseBrowser()
      .from("site_content")
      .select("value")
      .eq("key", "pickup")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setMsg({ ok: false, text: `ما قدرنا نحمّل الإعدادات: ${error.message}` });
          return;
        }
        if (data?.value) setV({ ...DEFAULTS, ...(data.value as Partial<Pickup>) });
        setLoaded(true);
      });
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const value: Pickup = {
      enabled: v.enabled,
      address: v.address.trim(),
      hours: v.hours.trim(),
      pay_note: v.pay_note.trim(),
      map_url: v.map_url.trim(),
    };
    const { error } = await supabaseBrowser()
      .from("site_content")
      .upsert({ key: "pickup", value, updated_at: new Date().toISOString() });
    setBusy(false);
    setMsg(error ? { ok: false, text: `ما انحفظ: ${error.message}` } : { ok: true, text: "انحفظ — بينعكس عالموقع فوراً." });
  }

  const live = v.enabled && v.address.trim() !== "";

  return (
    <details className="border p-4" open={loaded && v.enabled && !v.address.trim()}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
        <Icon name="branch" size={18} className="text-muted-foreground" />
          الاستلام من المحل
          <HintDot
            hint={{
              title: "الاستلام من المحل (مجاناً)",
              what: "الزبون بيختار عالموقع «Pick up from the shop» بدل التوصيل: بلا رسوم توصيل، وبيدفع بالمحل كاش أو Whish.",
              source: "من جدول site_content (مفتاح pickup).",
              edit: "عبّي عنوان المحل واكبس «احفظ». طول ما العنوان فاضي، الخيار مخفي عالموقع.",
            }}
          />
        </span>
        <span className={`text-xs ${live ? "text-foreground" : "text-muted-foreground"}`}>
          {!loaded ? "…" : live ? "ظاهر عالموقع" : v.enabled ? "مخفي — ناقص العنوان" : "مطفّى"}
        </span>
      </summary>

      <div className="mt-4 grid gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.enabled}
            disabled={!canEdit}
            onChange={(e) => setV({ ...v, enabled: e.target.checked })}
          />
          فعّل خيار الاستلام من المحل
        </label>
        <div className="grid gap-1.5">
          <Label htmlFor="pk-address">عنوان المحل (بالإنكليزي — بيظهر للزبون)</Label>
          <Input
            id="pk-address"
            dir="ltr"
            value={v.address}
            disabled={!canEdit}
            placeholder="e.g. Hamra Street, Beirut"
            onChange={(e) => setV({ ...v, address: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pk-map">رابط Google Maps للمحل</Label>
          <Input
            id="pk-map"
            dir="ltr"
            value={v.map_url}
            disabled={!canEdit}
            placeholder="https://maps.app.goo.gl/…"
            onChange={(e) => setV({ ...v, map_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            زر «Directions» عالموقع وبالإيميل بيفتح هالرابط (عبر bachwears.com/visit). بلا رابط، بيدوّر عالعنوان بـGoogle Maps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pk-hours">الدوام</Label>
            <Input
              id="pk-hours"
              dir="ltr"
              value={v.hours}
              disabled={!canEdit}
              onChange={(e) => setV({ ...v, hours: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pk-pay">ملاحظة الدفع</Label>
            <Input
              id="pk-pay"
              dir="ltr"
              value={v.pay_note}
              disabled={!canEdit}
              onChange={(e) => setV({ ...v, pay_note: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          طلبات الاستلام بتمشي بنفس الخطوات: بعد «جاهز» بتصير «جاهز للاستلام» (الزبون بتوصله رسالة)، وبعدين «انستلم» لما ياخدها ويدفع.
        </p>
        {canEdit ? (
          <div className="flex items-center gap-3">
            <Button size="sm" disabled={busy || !loaded} onClick={() => void save()}>
              {busy ? "عم نحفظ…" : "احفظ"}
            </Button>
            {msg ? <span role="status" className={`text-xs ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</span> : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">التعديل للسوبر أدمن، مدير المحل أو مسؤول التسويق.</p>
        )}
      </div>
    </details>
  );
}
