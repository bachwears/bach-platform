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

/** MGMT editor for the storefront homepage hero — copy + campaign image. */
export function SiteContentEditor() {
  const supabase = supabaseBrowser();
  const [hero, setHero] = useState<Hero>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabase
      .from("site_content")
      .select("value")
      .eq("key", "home_hero")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setHero({ ...EMPTY, ...(data.value as Partial<Hero>) });
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
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "home_hero", value: hero, updated_at: new Date().toISOString() });
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

      {err && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
      {msg && <p className="rounded-md border px-4 py-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
      <Button onClick={() => void save()} disabled={busy}>
        {busy ? "عم نحفظ…" : "حفظ التغييرات"}
      </Button>
    </div>
  );
}
