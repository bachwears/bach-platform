"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Select } from "@bach/ui/components/select";

const SEASONS: Array<[string, string]> = [
  ["winter", "شتوي ❄️"],
  ["spring", "ربيعي 🌱"],
  ["summer", "صيفي ☀️"],
  ["autumn", "خريفي 🍂"],
  ["all_season", "كل المواسم"],
];

interface Campaign {
  id: string;
  name_ar: string;
  percent_off: number;
  target_kind: string;
  target_season: string | null;
  target_category: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
  affected_products: string[];
}

interface Promo {
  id: string;
  code: string;
  kind: string;
  value: number;
  is_enabled: boolean;
  is_birthday: boolean;
}

interface Popup {
  id: string;
  title_en: string;
  body_en: string;
  is_active: boolean;
}

export function Marketing() {
  const supabase = supabaseBrowser();
  const [season, setSeason] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // new campaign form
  const [cName, setCName] = useState("");
  const [cPct, setCPct] = useState("20");
  const [cKind, setCKind] = useState("season");
  const [cSeason, setCSeason] = useState("winter");
  const [cCategory, setCCategory] = useState("");
  const [cEnds, setCEnds] = useState("");
  // new promo form
  const [pCode, setPCode] = useState("");
  const [pValue, setPValue] = useState("10");
  // new popup form
  const [puTitle, setPuTitle] = useState("");
  const [puBody, setPuBody] = useState("");

  const load = useCallback(async () => {
    const [m, c, cats, pr, pu] = await Promise.all([
      supabase.from("merchandising_settings").select("active_season").single(),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("categories").select("id, name_ar").eq("is_active", true).order("sort"),
      supabase.from("promocodes").select("id, code, kind, value, is_enabled, is_birthday").order("code"),
      supabase.from("popups").select("id, title_en, body_en, is_active").order("created_at", { ascending: false }),
    ]);
    setSeason(m.data?.active_season ?? "all_season");
    setCampaigns((c.data ?? []) as unknown as Campaign[]);
    setCategories(cats.data ?? []);
    if (!cCategory && cats.data?.length) setCCategory(cats.data[0]!.id);
    setPromos((pr.data ?? []) as unknown as Promo[]);
    setPopups((pu.data ?? []) as unknown as Popup[]);
  }, [supabase, cCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(m: string) {
    setMsg(m);
    setError("");
    setTimeout(() => setMsg(""), 4000);
  }
  function fail(e: string) {
    setError(e);
    setMsg("");
  }

  async function flipSeason(s: string) {
    setBusy(true);
    const { error: err } = await supabase.from("merchandising_settings").update({ active_season: s, updated_at: new Date().toISOString() }).eq("id", true);
    setBusy(false);
    if (err) fail(`ما مشي التبديل: ${err.message}`);
    else {
      setSeason(s);
      flash("الموسم تبدّل — المتجر صار يقدّم هالموسم.");
    }
  }

  async function createCampaign() {
    if (!cName.trim() || busy) return;
    setBusy(true);
    const { error: err } = await supabase.from("campaigns").insert({
      name_ar: cName.trim(),
      percent_off: parseInt(cPct, 10) || 10,
      target_kind: cKind,
      target_season: cKind === "season" ? cSeason : null,
      target_category: cKind === "category" ? cCategory : null,
      ends_on: cEnds || null,
    });
    setBusy(false);
    if (err) fail(`ما انحفظت الحملة: ${err.message}`);
    else {
      setCName("");
      flash("انحفظت كمسودة — انشرها لما تكون جاهز.");
      void load();
    }
  }

  async function publish(id: string) {
    setBusy(true);
    const { data, error: err } = await supabase.rpc("publish_campaign", { p_id: id });
    setBusy(false);
    if (err) fail(`ما مشي النشر: ${err.message}`);
    else {
      flash(`الحملة صارت شغّالة — ${data} منتج تنزّل سعره.`);
      void load();
    }
  }

  async function endCampaign(id: string) {
    setBusy(true);
    const { data, error: err } = await supabase.rpc("end_campaign", { p_id: id });
    setBusy(false);
    if (err) fail(`ما مشي الإنهاء: ${err.message}`);
    else {
      flash(`انتهت الحملة — رجعت الأسعار لـ${data} منتج.`);
      void load();
    }
  }

  async function createPromo() {
    const code = pCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!code || busy) return;
    setBusy(true);
    const { error: err } = await supabase.from("promocodes").insert({
      code,
      kind: "percent",
      value: parseInt(pValue, 10) || 10,
      requires_account: true,
    });
    setBusy(false);
    if (err) fail(err.message.includes("duplicate") ? "هالكود موجود من قبل." : `ما انحفظ الكود: ${err.message}`);
    else {
      setPCode("");
      flash("الكود جاهز وشغّال.");
      void load();
    }
  }

  async function togglePromo(p: Promo) {
    await supabase.from("promocodes").update({ is_enabled: !p.is_enabled, updated_at: new Date().toISOString() }).eq("id", p.id);
    void load();
  }

  async function createPopup() {
    if (!puTitle.trim() || !puBody.trim() || busy) return;
    setBusy(true);
    const { error: err } = await supabase.from("popups").insert({ title_en: puTitle.trim(), body_en: puBody.trim(), is_active: true });
    setBusy(false);
    if (err) fail(`ما انحفظ البوب-أب: ${err.message}`);
    else {
      setPuTitle("");
      setPuBody("");
      flash("البوب-أب صار ظاهر عالمتجر.");
      void load();
    }
  }

  async function togglePopup(p: Popup) {
    await supabase.from("popups").update({ is_active: !p.is_active }).eq("id", p.id);
    void load();
  }

  return (
    <div className="space-y-8">
      {msg && <p className="rounded-md bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
      {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

      {/* Season flip */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">موسم المتجر</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          كبسة وحدة وبيتقدّم الموسم المختار بواجهة المتجر.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SEASONS.map(([k, label]) => (
            <Button key={k} variant={season === k ? "default" : "outline"} size="sm" disabled={busy} onClick={() => void flipSeason(k)}>
              {label}
            </Button>
          ))}
        </div>
      </section>

      {/* Campaigns */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">الحملات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          "20% على كل الشتوي" = اختار الهدف والنسبة، انشر — الأسعار بتتنزّل فوراً وبترجع لما تنهيها.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="اسم الحملة" className="sm:col-span-2" />
          <Input value={cPct} onChange={(e) => setCPct(e.target.value)} placeholder="%" inputMode="numeric" className="text-left font-mono" />
          <Select value={cKind} onChange={(e) => setCKind(e.target.value)}>
            <option value="season">حسب الموسم</option>
            <option value="category">حسب الفئة</option>
            <option value="all">كل المنتجات</option>
          </Select>
          {cKind === "season" ? (
            <Select value={cSeason} onChange={(e) => setCSeason(e.target.value)}>
              {SEASONS.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Select>
          ) : cKind === "category" ? (
            <Select value={cCategory} onChange={(e) => setCCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </Select>
          ) : (
            <div />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">تاريخ الانتهاء (اختياري)</label>
          <Input type="date" value={cEnds} onChange={(e) => setCEnds(e.target.value)} className="w-40" dir="ltr" />
          <Button size="sm" disabled={busy || !cName.trim()} onClick={() => void createCampaign()}>
            حفظ كمسودة
          </Button>
        </div>

        {campaigns.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-right text-muted-foreground">
                <th className="py-2 font-normal">الحملة</th>
                <th className="py-2 font-normal">الخصم</th>
                <th className="py-2 font-normal">الهدف</th>
                <th className="py-2 font-normal">الحالة</th>
                <th className="py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{c.name_ar}{c.ends_on ? <span className="block text-xs text-muted-foreground" dir="ltr">حتى {c.ends_on}</span> : null}</td>
                  <td className="py-2 font-mono">{c.percent_off}%</td>
                  <td className="py-2">
                    {c.target_kind === "all" ? "الكل" : c.target_kind === "season" ? SEASONS.find(([k]) => k === c.target_season)?.[1] : categories.find((x) => x.id === c.target_category)?.name_ar ?? "فئة"}
                  </td>
                  <td className="py-2">
                    <Badge variant={c.status === "live" ? "default" : "secondary"}>
                      {c.status === "live" ? `شغّالة (${c.affected_products.length})` : c.status === "draft" ? "مسودة" : "منتهية"}
                    </Badge>
                  </td>
                  <td className="py-2 text-left">
                    {c.status === "draft" && (
                      <Button size="sm" disabled={busy} onClick={() => void publish(c.id)}>انشر</Button>
                    )}
                    {c.status === "live" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void endCampaign(c.id)}>أنهِها</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Promocodes */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">أكواد الخصم</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input value={pCode} onChange={(e) => setPCode(e.target.value)} placeholder="CODE" dir="ltr" className="w-40 font-mono uppercase" />
          <Input value={pValue} onChange={(e) => setPValue(e.target.value)} placeholder="%" inputMode="numeric" className="w-20 text-left font-mono" />
          <Button size="sm" disabled={busy || !pCode.trim()} onClick={() => void createPromo()}>ضيف كود</Button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {promos.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="font-mono uppercase" dir="ltr">{p.code}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-muted-foreground">{p.kind === "percent" ? `${p.value}%` : `$${(p.value / 100).toFixed(2)}`}</span>
                {p.is_birthday && <Badge variant="secondary">عيد ميلاد</Badge>}
                <Button size="sm" variant={p.is_enabled ? "outline" : "default"} onClick={() => void togglePromo(p)}>
                  {p.is_enabled ? "عطّل" : "فعّل"}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Popups */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">بوب-أب المتجر</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input value={puTitle} onChange={(e) => setPuTitle(e.target.value)} placeholder="العنوان (EN)" dir="ltr" />
          <Input value={puBody} onChange={(e) => setPuBody(e.target.value)} placeholder="النص (EN)" dir="ltr" className="sm:col-span-2" />
        </div>
        <Button size="sm" className="mt-2" disabled={busy || !puTitle.trim() || !puBody.trim()} onClick={() => void createPopup()}>
          انشر بوب-أب
        </Button>
        <ul className="mt-4 space-y-2 text-sm">
          {popups.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span dir="ltr">{p.title_en} — <span className="text-muted-foreground">{p.body_en.slice(0, 60)}</span></span>
              <Button size="sm" variant={p.is_active ? "outline" : "default"} onClick={() => void togglePopup(p)}>
                {p.is_active ? "خبّيه" : "فعّله"}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
