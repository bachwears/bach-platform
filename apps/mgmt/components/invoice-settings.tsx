"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Icon } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { ReceiptView, type ReceiptData } from "@bach/ui/components/receipt";
import {
  DEFAULT_INVOICE_SETTINGS,
  loadInvoiceConfig,
  type InvoiceSettings,
  type ReturnWindows,
} from "@bach/ui/lib/invoice-settings";

// a made-up sale, only for the preview
const SAMPLE: ReceiptData = {
  number: 1042,
  invoiceNumber: 318,
  lines: [
    { key: "a", nameEn: "Ribbed Knit Crew Neck Sweater", size: "M", colorEn: "Burgundy", quantity: 1, unitUsdCents: 4500 },
    { key: "b", nameEn: "Braided Leather Belt", size: "90", colorEn: "Black", quantity: 1, unitUsdCents: 2500 },
  ],
  subtotal: 7000,
  discount: 0,
  tva: 0,
  total: 7000,
  paidUsdCents: 7000,
  paidLbp: 0,
  changeLbp: 0,
  rate: 89500,
};

/**
 * MGMT → إعدادات الفاتورة: what the till receipt prints around the sale — logo or
 * name, shop details, registration number, LBP total, returns line, footer and
 * roll width — with a live preview. Saved in site_content `invoice`; the POS
 * picks it up on its next receipt (and keeps a copy for offline printing).
 */
export function InvoiceSettingsForm({ branchName }: { branchName: string }) {
  const supabase = supabaseBrowser();
  const [s, setS] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [returns, setReturns] = useState<ReturnWindows | null>(null);
  const [shopAddress, setShopAddress] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void (async () => {
      const [config, { data: pickup }] = await Promise.all([
        loadInvoiceConfig(supabase),
        supabase.from("site_content").select("value").eq("key", "pickup").maybeSingle(),
      ]);
      setS(config.settings);
      setReturns(config.returns);
      setShopAddress(String((pickup?.value as { address?: string } | null)?.address ?? ""));
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) => setS((cur) => ({ ...cur, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    setErr("");
    const { error } = await supabase.from("site_content").upsert({ key: "invoice", value: s, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) setErr(`ما انحفظت: ${error.message}`);
    else setMsg("انحفظت — الإيصال الجاي بالكاشير بيطلع هيك.");
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">عم نحمّل…</p>;

  const toggle = (k: "show_logo" | "show_branch" | "show_lbp_total" | "show_rate" | "show_policy", label: string, note?: string) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-5 w-5 accent-foreground" checked={s[k]} onChange={(e) => set(k, e.target.checked)} />
      <span>
        {label}
        {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
      </span>
    </label>
  );
  const field = (k: "business_name" | "address" | "phone" | "website" | "instagram" | "tax_id" | "footer_en" | "footer_ar", label: string, opts?: { ltr?: boolean; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`inv-${k}`}>{label}</Label>
      <Input
        id={`inv-${k}`}
        dir={opts?.ltr ? "ltr" : undefined}
        placeholder={opts?.placeholder}
        value={s[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="space-y-4 border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon name="invoices" size={18} className="text-muted-foreground" />
            راس الفاتورة
            <HintDot
              hint={{
                title: "راس الفاتورة",
                what: "شو بيطلع فوق الإيصال: اللوغو أو الاسم، وتحتو العنوان والتلفون والموقع والإنستغرام ورقم التسجيل — كل سطر فاضي ما بيطلع.",
                source: "جدول site_content (مفتاح invoice).",
                edit: "من هون. الكاشير بيطبع الإعدادات الجديدة من أول إيصال بعد الحفظ.",
              }}
            />
          </h2>
          {toggle("show_logo", "اطبع لوغو BACH", "إذا مطفي، بينطبع اسم المحل بالخط العريض بدالو.")}
          {field("business_name", "اسم المحل (بالإنكليزي)", { ltr: true })}
          <div className="space-y-1.5">
            {field("address", "العنوان", { ltr: true, placeholder: shopAddress || "Street, building, city" })}
            {shopAddress && s.address !== shopAddress ? (
              <button type="button" className="text-xs underline underline-offset-2" onClick={() => set("address", shopAddress)}>
                استعمل عنوان المحل: <span dir="ltr">{shopAddress}</span>
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("phone", "التلفون", { ltr: true, placeholder: "+961 …" })}
            {field("website", "الموقع", { ltr: true })}
            {field("instagram", "إنستغرام (بلا @)", { ltr: true, placeholder: "bachwears" })}
            {field("tax_id", "رقم السجل / التسجيل المالي", { ltr: true, placeholder: "اختياري" })}
          </div>
          {toggle("show_branch", "اطبع اسم الفرع")}
        </section>

        <section className="space-y-4 border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon name="price" size={18} className="text-muted-foreground" />
            المبالغ
          </h2>
          {toggle("show_lbp_total", "اطبع المجموع بالليرة حدّ الدولار")}
          {toggle("show_rate", "اطبع سطر سعر الصرف")}
        </section>

        <section className="space-y-4 border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon name="note" size={18} className="text-muted-foreground" />
            آخر الفاتورة
          </h2>
          {toggle(
            "show_policy",
            "اطبع سياسة الإرجاع",
            returns
              ? `بيطلع: «Returns within ${returns.return_days} days · exchange within ${returns.exchange_days} days, with this receipt.» — الأيام من إعدادات الإرجاع.`
              : "الأيام بتنقرا من إعدادات الإرجاع.",
          )}
          {field("footer_en", "جملة الشكر (بالإنكليزي)", { ltr: true })}
          {field("footer_ar", "سطر بالعربي (اختياري)", { placeholder: "مثلاً: شكراً لزيارتكم" })}
        </section>

        <section className="space-y-3 border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon name="print" size={18} className="text-muted-foreground" />
            عرض ورق الطابعة
          </h2>
          <div className="flex gap-2">
            {(["80", "58"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => set("paper", w)}
                className={`border px-4 py-2 text-sm ${s.paper === w ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
              >
                {w} مم
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">طابعة المحل (C200I) رول 80 مم. الـ 58 مم للطابعات الصغيرة. ورقة تجهيز الطلبات بتمشي عنفس العرض.</p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={busy}>
            <Icon name="save" size={16} />
            {busy ? "عم نحفظ…" : "احفظ إعدادات الفاتورة"}
          </Button>
          <Button variant="ghost" onClick={() => setS(DEFAULT_INVOICE_SETTINGS)} disabled={busy}>
            رجّع الأصل
          </Button>
          {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      </div>

      <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
        <p className="text-sm text-muted-foreground">معاينة (بيع تجريبي):</p>
        <div className="bg-white text-black">
          <ReceiptView receipt={SAMPLE} branchName={branchName} config={{ settings: s, returns }} />
        </div>
      </aside>
    </div>
  );
}
