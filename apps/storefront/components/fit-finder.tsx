"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { FIT_PREFS, FIT_SLOT, fitKind, recommend, savableSize, type FitPref, type FitResult } from "../lib/fit";
import { useLocale } from "../lib/locale-client";
import { ModalShell } from "./modal-shell";
import type { SizeGuideData } from "./size-guide";

const STORE = "bach-fit";
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];
const FIELD =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors focus:border-foreground";

interface Answers {
  height: string;
  weight: string;
  fit: FitPref;
  shoe: string;
}

/**
 * "Find your size" next to the size guide: height, weight and preferred fit (or
 * the usual EU size for shoes) → one recommended size with a one-line reason.
 * Signed-in customers keep their answers (and the size) on their profile; guests
 * keep them for this visit only.
 */
/** Fired with { size } when the shopper takes the recommendation; the buy box selects it. */
export const FIT_PICK_EVENT = "bach-fit-pick";
/** the size sheet's "Find your size" opens the finder */
export const FIT_OPEN_EVENT = "bach-fit-open";

export function FitFinder({
  guide,
  categoryCodes,
  sizes,
  hideTrigger = false,
}: {
  guide: SizeGuideData | null;
  categoryCodes: string[];
  sizes: string[];
  /** no link of its own: opened from the size sheet's "Find your size" */
  hideTrigger?: boolean;
}) {
  const locale = useLocale();
  const kind = fitKind(categoryCodes, sizes);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(FIT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(FIT_OPEN_EVENT, onOpen);
  }, []);
  const [answers, setAnswers] = useState<Answers>({ height: "", weight: "", fit: "regular", shoe: "" });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [result, setResult] = useState<FitResult | null>(null);
  const [saved, setSaved] = useState(false);

  // Prefill once the dialog opens: the profile when signed in, else this visit's answers.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    async function prefill() {
      try {
        const raw = sessionStorage.getItem(STORE);
        if (raw && alive) setAnswers((a) => ({ ...a, ...(JSON.parse(raw) as Partial<Answers>) }));
      } catch {
        /* nothing kept */
      }
      const supabase = supabaseBrowser();
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("customers")
        .select("id, height_cm, weight_kg, fit_pref, size_shoe")
        .eq("auth_user_id", uid)
        .maybeSingle();
      // columns not there yet (migration pending): behave like a guest
      if (error || !data || !alive) return;
      const row = data as { id: string; height_cm: number | null; weight_kg: number | null; fit_pref: FitPref | null; size_shoe: string | null };
      setCustomerId(row.id);
      setAnswers((a) => ({
        height: row.height_cm ? String(row.height_cm) : a.height,
        weight: row.weight_kg ? String(row.weight_kg) : a.weight,
        fit: row.fit_pref ?? a.fit,
        shoe: row.size_shoe ?? a.shoe,
      }));
    }
    void prefill();
    return () => {
      alive = false;
    };
  }, [open]);

  if (!kind) return null;

  const height = Number(answers.height);
  const weight = Number(answers.weight);
  const ready =
    kind === "shoe" ? Boolean(answers.shoe) : height >= 140 && height <= 220 && weight >= 40 && weight <= 200;

  async function find() {
    if (!kind || !ready) return;
    const r = recommend(kind, { heightCm: height, weightKg: weight, fit: answers.fit, shoe: answers.shoe }, sizes, guide);
    setResult(r);
    setSaved(false);
    try {
      sessionStorage.setItem(STORE, JSON.stringify(answers));
    } catch {
      /* private mode: the answers just aren't kept */
    }
    if (!customerId) return;
    const patch: Record<string, string | number | null> =
      kind === "shoe" ? {} : { height_cm: Math.round(height), weight_kg: Math.round(weight), fit_pref: answers.fit };
    if (savableSize(kind, r.size)) patch[FIT_SLOT[kind]] = kind === "shoe" ? r.size : r.size.toUpperCase();
    if (!Object.keys(patch).length) return;
    const { error } = await supabaseBrowser().from("customers").update(patch).eq("id", customerId);
    setSaved(!error);
  }

  function reason(r: FitResult): string {
    if (kind === "shoe") return t(locale, r.edge === "nearest" ? "sf.fit.reasonShoeNearest" : "sf.fit.reasonShoe");
    const base = t(locale, r.measure === "waist" ? "sf.fit.reasonWaist" : "sf.fit.reasonChest", {
      cm: r.estimateCm ?? 0,
      f: t(locale, `sf.fit.pref.${answers.fit}`).toLowerCase(),
    });
    return r.edge ? `${base} ${t(locale, `sf.fit.edge.${r.edge}`)}` : base;
  }

  return (
    <>
      {hideTrigger ? null : (
        <button type="button" onClick={() => setOpen(true)} className="type-meta underline underline-offset-4 hover:opacity-60">
          {t(locale, "sf.fit.open")}
        </button>
      )}
      {open && (
        <ModalShell label={t(locale, "sf.fit.title")} onClose={() => setOpen(false)} className="w-full max-w-md border bg-background p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="type-heading">{t(locale, "sf.fit.title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t(locale, "sf.fit.close")}
              className="-me-2 -mt-2 grid h-11 w-11 place-items-center"
            >
              <X className="h-5 w-5" strokeWidth={1} aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t(locale, kind === "shoe" ? "sf.fit.subShoe" : "sf.fit.sub")}</p>

          <form
            className="mt-6 space-y-6 text-sm"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void find();
            }}
          >
            {kind === "shoe" ? (
              <label className="block">
                <span className="type-meta text-muted-foreground">{t(locale, "sf.fit.shoe")}</span>
                <select
                  className={FIELD}
                  value={answers.shoe}
                  onChange={(e) => setAnswers({ ...answers, shoe: e.target.value })}
                  dir="ltr"
                >
                  <option value="">—</option>
                  {SHOE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      EU {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <label className="block">
                    <span className="type-meta text-muted-foreground">{t(locale, "sf.fit.height")}</span>
                    <input
                      className={FIELD}
                      type="number"
                      inputMode="numeric"
                      min={140}
                      max={220}
                      value={answers.height}
                      onChange={(e) => setAnswers({ ...answers, height: e.target.value })}
                      dir="ltr"
                    />
                  </label>
                  <label className="block">
                    <span className="type-meta text-muted-foreground">{t(locale, "sf.fit.weight")}</span>
                    <input
                      className={FIELD}
                      type="number"
                      inputMode="numeric"
                      min={40}
                      max={200}
                      value={answers.weight}
                      onChange={(e) => setAnswers({ ...answers, weight: e.target.value })}
                      dir="ltr"
                    />
                  </label>
                </div>
                <fieldset>
                  <legend className="type-meta text-muted-foreground">{t(locale, "sf.fit.prefer")}</legend>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {FIT_PREFS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={answers.fit === p}
                        onClick={() => setAnswers({ ...answers, fit: p })}
                        className={`type-label h-11 border ${answers.fit === p ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                      >
                        {t(locale, `sf.fit.pref.${p}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {(answers.height || answers.weight) && !ready ? (
                  <p className="text-xs text-muted-foreground">{t(locale, "sf.fit.range")}</p>
                ) : null}
              </>
            )}
            <button type="submit" className="type-label h-12 w-full bg-foreground text-background hover:opacity-90 disabled:opacity-40" disabled={!ready}>
              {t(locale, "sf.fit.find")}
            </button>
          </form>

          {result && (
            <div className="mt-8 border-t pt-6" role="status">
              <p className="type-heading">{t(locale, "sf.fit.result", { s: result.size })}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason(result)}</p>
              {saved && <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.fit.saved")}</p>}
              <p className="type-meta mt-4 text-muted-foreground">{t(locale, "sf.fit.honest")}</p>
              <button
                type="button"
                className="type-label mt-5 h-11 w-full border border-foreground hover:bg-foreground hover:text-background"
                onClick={() => {
                  // the buy box listens and picks this size (see add-to-cart.tsx)
                  window.dispatchEvent(new CustomEvent(FIT_PICK_EVENT, { detail: { size: result.size } }));
                  setOpen(false);
                }}
              >
                {t(locale, "sf.fit.use", { s: result.size })}
              </button>
            </div>
          )}
        </ModalShell>
      )}
    </>
  );
}
