"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Textarea } from "@bach/ui/components/textarea";
import { HintDot } from "@bach/ui/components/hint-dot";

interface Hero {
  eyebrow: string;
  headline: string;
  sub: string;
  cta_label: string;
  cta_href: string;
  image_url: string;
  image_alt: string;
}

const EMPTY: Hero = {
  eyebrow: "",
  headline: "",
  sub: "",
  cta_label: "",
  cta_href: "/shop",
  image_url: "",
  image_alt: "",
};

interface Banner {
  enabled: boolean;
  text: string;
  cta_label: string;
  cta_href: string;
}

interface PolicyDoc {
  title: string;
  body: string;
}

const EMPTY_BANNER: Banner = { enabled: false, text: "", cta_label: "", cta_href: "/shop" };
const EMPTY_POLICY: PolicyDoc = { title: "", body: "" };

/** MGMT editor for the storefront homepage hero — copy + campaign image. */
export function SiteContentEditor() {
  const supabase = supabaseBrowser();
  const [hero, setHero] = useState<Hero>(EMPTY);
  const [banner, setBanner] = useState<Banner>(EMPTY_BANNER);
  const [shipping, setShipping] = useState<PolicyDoc>(EMPTY_POLICY);
  const [returnsPg, setReturnsPg] = useState<PolicyDoc>(EMPTY_POLICY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["home_hero", "home_banner", "page_shipping", "page_returns"])
      .then(({ data }) => {
        for (const row of data ?? []) {
          const v = row.value as Record<string, unknown>;
          if (row.key === "home_hero") setHero({ ...EMPTY, ...(v as Partial<Hero>) });
          if (row.key === "home_banner") setBanner({ ...EMPTY_BANNER, ...(v as Partial<Banner>) });
          if (row.key === "page_shipping") setShipping({ ...EMPTY_POLICY, ...(v as Partial<PolicyDoc>) });
          if (row.key === "page_returns") setReturnsPg({ ...EMPTY_POLICY, ...(v as Partial<PolicyDoc>) });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof Hero>(k: K, v: string) {
    setHero((h) => ({ ...h, [k]: v }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setErr("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `site/hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-media")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    setUploading(false);
    if (error) {
      setErr(`ما قدرنا نرفع الصورة: ${error.message}`);
      return;
    }
    set("image_url", supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl);
  }

  async function save() {
    setBusy(true);
    setMsg("");
    setErr("");
    const now = new Date().toISOString();
    const { error } = await supabase.from("site_content").upsert([
      { key: "home_hero", value: hero, updated_at: now },
      { key: "home_banner", value: banner, updated_at: now },
      { key: "page_shipping", value: shipping, updated_at: now },
      { key: "page_returns", value: returnsPg, updated_at: now },
    ]);
    setBusy(false);
    if (error) {
      setErr(`ما مشي الحفظ: ${error.message}`);
      return;
    }
    setMsg("انحفظ — التغيير بيبان عالموقع خلال لحظات.");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-lg border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          واجهة الصفحة الرئيسية (Hero)
          <HintDot
            hint={{
              title: "واجهة الرئيسية",
              what: "أول قسم بيشوفه الزوار على bachwears.com: الصورة الكبيرة والعناوين وزر التسوق.",
              source: "الداتا من جدول site_content (مفتاح home_hero).",
              edit: "عدّل هون واكبس حفظ — بينعكس عالموقع مباشرة. إذا تركت خانة فاضية بيرجع النص الأصلي.",
            }}
          />
        </h2>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sc-eyebrow">السطر الصغير فوق العنوان (بالإنكليزي)</Label>
            <Input id="sc-eyebrow" dir="ltr" value={hero.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sc-headline">العنوان الرئيسي</Label>
            <Input id="sc-headline" dir="ltr" className="text-lg" value={hero.headline} onChange={(e) => set("headline", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sc-sub">السطر التحتاني</Label>
            <Textarea id="sc-sub" dir="ltr" rows={2} value={hero.sub} onChange={(e) => set("sub", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-cta">نص الزر</Label>
              <Input id="sc-cta" dir="ltr" value={hero.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-href" className="flex items-center gap-2">
                وين بيودّي الزر
                <HintDot
                  hint={{
                    title: "رابط الزر",
                    what: "المسار اللي بيفتح لما الزبون يكبس زر الواجهة.",
                    source: "مسار داخلي بالموقع، مثل /shop أو /shop?cat=JACKETS-COATS.",
                    edit: "خليه يبلّش بـ / — مثلاً /shop?sale=1 وقت العروض.",
                  }}
                />
              </Label>
              <Input id="sc-href" dir="ltr" value={hero.cta_href} onChange={(e) => set("cta_href", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          صورة الواجهة
          <HintDot
            hint={{
              title: "صورة الواجهة",
              what: "صورة الحملة اللي بتغطي أعلى الصفحة الرئيسية.",
              source: "بتنرفع على تخزين Supabase (product-media/site).",
              edit: "ارفع صورة عرضية كبيرة (1600px+ عرض). إذا ما في صورة مرفوعة بيستعمل الموقع صورة الحملة الأصلية.",
            }}
          />
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.image_url || "https://bachwears.com/hero-campaign.jpg"}
          alt="معاينة"
          className="h-44 w-full rounded-md object-cover"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="image/*"
            className="max-w-xs"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
            }}
          />
          {uploading && <span className="text-sm text-muted-foreground">عم نرفع…</span>}
          {hero.image_url && (
            <Button variant="ghost" size="sm" onClick={() => set("image_url", "")}>
              رجّع الصورة الأصلية
            </Button>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sc-alt">وصف الصورة (لمحركات البحث وقارئات الشاشة، بالإنكليزي)</Label>
          <Input id="sc-alt" dir="ltr" value={hero.image_alt} onChange={(e) => set("image_alt", e.target.value)} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          بانر العروض تحت الواجهة
          <HintDot
            hint={{
              title: "بانر العروض",
              what: "شريط أسود رفيع بيظهر تحت واجهة الرئيسية مباشرة — للعروض والإعلانات القصيرة.",
              source: "من جدول site_content (مفتاح home_banner).",
              edit: "فعّله واكتب النص واكبس حفظ. طفّيه بأي وقت والموقع بيرجع بلا بانر.",
            }}
          />
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={banner.enabled}
            onChange={(e) => setBanner((b) => ({ ...b, enabled: e.target.checked }))}
            className="h-4 w-4"
          />
          البانر مفعّل عالموقع
        </label>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="bn-text">نص البانر (بالإنكليزي)</Label>
            <Input id="bn-text" dir="ltr" value={banner.text} onChange={(e) => setBanner((b) => ({ ...b, text: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bn-cta">نص الرابط (اختياري)</Label>
              <Input id="bn-cta" dir="ltr" value={banner.cta_label} onChange={(e) => setBanner((b) => ({ ...b, cta_label: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bn-href">وين بيودّي</Label>
              <Input id="bn-href" dir="ltr" value={banner.cta_href} onChange={(e) => setBanner((b) => ({ ...b, cta_href: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          صفحة التوصيل والشحن
          <HintDot
            hint={{
              title: "صفحة الشحن",
              what: "الصفحة اللي بيقراها الزبون على bachwears.com/shipping — سياسة التوصيل كاملة.",
              source: "من جدول site_content (مفتاح page_shipping)، ورابطها بالفوتر.",
              edit: "سطر فاضي بين الفقرات = فقرة جديدة عالموقع.",
            }}
          />
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="sh-title">العنوان</Label>
          <Input id="sh-title" dir="ltr" value={shipping.title} onChange={(e) => setShipping((x) => ({ ...x, title: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sh-body">النص (بالإنكليزي)</Label>
          <Textarea id="sh-body" dir="ltr" rows={8} value={shipping.body} onChange={(e) => setShipping((x) => ({ ...x, body: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          صفحة الإرجاع والتبديل
          <HintDot
            hint={{
              title: "صفحة الإرجاع",
              what: "سياسة الإرجاع على bachwears.com/returns-policy — مع زر «Start a return» جاهز آخرها.",
              source: "من جدول site_content (مفتاح page_returns)، ورابطها بالفوتر.",
              edit: "سطر فاضي بين الفقرات = فقرة جديدة عالموقع.",
            }}
          />
        </h2>
        <div className="grid gap-1.5">
          <Label htmlFor="rt-title">العنوان</Label>
          <Input id="rt-title" dir="ltr" value={returnsPg.title} onChange={(e) => setReturnsPg((x) => ({ ...x, title: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rt-body">النص (بالإنكليزي)</Label>
          <Textarea id="rt-body" dir="ltr" rows={8} value={returnsPg.body} onChange={(e) => setReturnsPg((x) => ({ ...x, body: e.target.value }))} />
        </div>
      </div>

      {err && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
      {msg && <p className="rounded-md border px-4 py-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
      <Button onClick={() => void save()} disabled={busy}>
        {busy ? "عم نحفظ…" : "حفظ التغييرات"}
      </Button>
    </div>
  );
}
