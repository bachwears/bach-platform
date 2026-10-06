"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { HintDot } from "@bach/ui/components/hint-dot";

import { NOT_SAVED } from "../lib/access";

// Same bounds the loyalty_settings() RPC clamps to.
const LIMITS = { perUsd: 100, rewardPoints: 100000, rewardCents: 100000, months: 60 };

/** Whole positive number from a text field, or null. */
function posInt(v: string, max: number): number | null {
  const s = v.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n >= 1 && n <= max ? n : null;
}

/** "5" / "5.5" / "5.50" dollars → cents with integer math (no floats stored). */
function dollarsToCents(v: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(v.trim());
  if (!m) return null;
  const cents = parseInt(m[1]!, 10) * 100 + parseInt(((m[2] ?? "") + "00").slice(0, 2), 10);
  return cents >= 1 && cents <= LIMITS.rewardCents ? cents : null;
}

const centsToDollars = (c: number) => (c % 100 === 0 ? String(c / 100) : `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`);

/**
 * MGMT card for the loyalty points programme (site_content 'loyalty'): on/off,
 * points per $1, the reward (N points → $X wallet credit) and the expiry window.
 * Reads the effective numbers from loyalty_settings(); if that RPC is missing
 * the card only says the programme isn't in the database yet.
 */
export function LoyaltySettings() {
  const supabase = supabaseBrowser();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [enabled, setEnabled] = useState(true);
  const [perUsd, setPerUsd] = useState("1");
  const [rewardPts, setRewardPts] = useState("100");
  const [rewardUsd, setRewardUsd] = useState("5");
  const [months, setMonths] = useState("6");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabase.rpc("loyalty_settings").then(({ data, error }) => {
      const row = (Array.isArray(data) ? data[0] : data) as
        | { enabled: boolean; points_per_usd: number; reward_points: number; reward_usd_cents: number; expiry_months: number }
        | null;
      if (error || !row) {
        setState("missing");
        return;
      }
      setEnabled(row.enabled);
      setPerUsd(String(row.points_per_usd));
      setRewardPts(String(row.reward_points));
      setRewardUsd(centsToDollars(row.reward_usd_cents));
      setMonths(String(row.expiry_months));
      setState("ready");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg("");
    setErr("");
    const value = {
      enabled,
      points_per_usd: posInt(perUsd, LIMITS.perUsd),
      reward_points: posInt(rewardPts, LIMITS.rewardPoints),
      reward_usd_cents: dollarsToCents(rewardUsd),
      expiry_months: posInt(months, LIMITS.months),
    };
    if (value.points_per_usd === null) return setErr(`النقاط عن كل $1 لازم تكون رقم صحيح بين 1 و${LIMITS.perUsd}.`);
    if (value.reward_points === null) return setErr(`عدد نقاط المكافأة لازم يكون رقم صحيح بين 1 و${LIMITS.rewardPoints}.`);
    if (value.reward_usd_cents === null) return setErr("قيمة المكافأة لازم تكون مبلغ بالدولار (مثلاً 5 أو 7.50)، بين $0.01 و$1000.");
    if (value.expiry_months === null) return setErr(`مدة الانتهاء لازم تكون عدد أشهر بين 1 و${LIMITS.months}.`);
    setBusy(true);
    const { data: changed, error } = await supabase
      .from("site_content")
      .upsert({ key: "loyalty", value, updated_at: new Date().toISOString() })
      .select("key");
    setBusy(false);
    if (error) setErr(`ما مشي الحفظ: ${error.message}`);
    else if (!changed?.length) setErr(NOT_SAVED);
    else setMsg(enabled ? "انحفظ — القواعد الجديدة بتمشي عالطلبات الجاية." : "انحفظ — البرنامج موقّف: ما في ربح ولا تحويل نقاط لحتى ترجع تشغّلو.");
  }

  return (
    <section className="border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        برنامج النقاط
        <HintDot
          hint={{
            title: "برنامج النقاط",
            what: "الزبون بيجمع نقاط عن كل دولار بيدفعو على القطع (التوصيل مش محسوب) لما يكمل بيع بالمحل أو يوصل طلب أونلاين، وبيحوّلها لرصيد بمحفظتو. المرتجع بيسحب نقاطو.",
            source: "القواعد محفوظة بجدول site_content (مفتاح loyalty)؛ رصيد كل زبون وحركاتو بالعملاء.",
            edit: "من هون (سوبر أدمن، مدير محل، مدير تسويق). رصيد زبون معيّن بيتعدّل من صفحة العملاء.",
          }}
        />
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">النقاط بتنحسب لحالها — هون بس بتحدد القواعد.</p>

      {state === "loading" ? (
        <p className="mt-3 text-sm text-muted-foreground">عم نحمّل…</p>
      ) : state === "missing" ? (
        <p className="mt-3 text-sm text-muted-foreground">برنامج النقاط مش جاهز بعد بقاعدة البيانات — بيبيّن هون أول ما يتفعّل.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
            البرنامج شغّال
            <HintDot
              hint={{
                title: "تشغيل / توقيف",
                what: "إذا وقّفتو: ما حدا بيربح نقاط جديدة، ما حدا بيقدر يحوّل، وبيختفي من المتجر والكاشير. الأرصدة الموجودة بتضل محفوظة.",
                source: "site_content ← loyalty ← enabled.",
                edit: "علّم أو شيل العلامة واكبس «احفظ قواعد النقاط».",
              }}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ly-per" className="flex items-center gap-2">
                كم نقطة عن كل $1
                <HintDot
                  hint={{
                    title: "النقاط عن كل دولار",
                    what: "عدد النقاط اللي بياخدها الزبون عن كل دولار كامل بيدفعو على القطع، بعد الخصومات. الكسور بتنزل (مثلاً $24.90 = 24 نقطة إذا 1).",
                    source: "site_content ← loyalty ← points_per_usd.",
                    edit: "رقم صحيح من 1 لـ100. التغيير بيمشي عالطلبات الجاية بس.",
                  }}
                />
              </Label>
              <Input id="ly-per" dir="ltr" inputMode="numeric" className="text-left font-mono" value={perUsd} onChange={(e) => setPerUsd(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ly-months" className="flex items-center gap-2">
                النقاط بتنتهي بعد (أشهر بلا شراء)
                <HintDot
                  hint={{
                    title: "انتهاء النقاط",
                    what: "إذا الزبون ما اشترى شي هالمدة، كل نقاطو بتنتهي. أي شراء جديد بيرجّع العدّاد من الأول.",
                    source: "site_content ← loyalty ← expiry_months؛ الفحص بيصير أوتوماتيك كل يوم الصبح.",
                    edit: "عدد أشهر من 1 لـ60.",
                  }}
                />
              </Label>
              <Input id="ly-months" dir="ltr" inputMode="numeric" className="text-left font-mono" value={months} onChange={(e) => setMonths(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-2">
              المكافأة
              <HintDot
                hint={{
                  title: "المكافأة",
                  what: "كل هالعدد من النقاط بيتحوّل لهالمبلغ رصيد بمحفظة الزبون. التحويل بياخد أكبر عدد مكافآت كاملة بيسمحو رصيدو.",
                  source: "site_content ← loyalty ← reward_points و reward_usd_cents (المبلغ محفوظ بالسنت).",
                  edit: "النقاط رقم صحيح؛ المبلغ بالدولار (مثلاً 5 أو 7.50).",
                }}
              />
            </Label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input aria-label="عدد نقاط المكافأة" dir="ltr" inputMode="numeric" className="w-28 text-left font-mono" value={rewardPts} onChange={(e) => setRewardPts(e.target.value)} />
              <span className="text-muted-foreground">نقطة =</span>
              <span className="text-muted-foreground" dir="ltr">$</span>
              <Input aria-label="قيمة المكافأة بالدولار" dir="ltr" inputMode="decimal" className="w-28 text-left font-mono" value={rewardUsd} onChange={(e) => setRewardUsd(e.target.value)} />
              <span className="text-muted-foreground">رصيد بالمحفظة</span>
            </div>
          </div>
          {err && <p className="bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}
          {msg && <p className="bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
          <Button size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? "عم نحفظ…" : "احفظ قواعد النقاط"}
          </Button>
        </div>
      )}
    </section>
  );
}
