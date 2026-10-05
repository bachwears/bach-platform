"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t, type Locale } from "@bach/i18n";

/**
 * Opt-in two-step sign-in: after the password, a 6-digit code is emailed and
 * the session only starts once it's entered (see AuthFlow). Switching it on or
 * off is an update to the customer's own row, so it needs a signed-in session.
 */
export function AccountTwoStep({
  locale,
  customerId,
  email,
  enabled,
  onSaved,
}: {
  locale: Locale;
  customerId: string;
  email: string;
  enabled: boolean;
  onSaved: (on: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("customers").update({ two_step_email: next }).eq("id", customerId);
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: t(locale, "sf.acct.saveFailed") });
      return;
    }
    onSaved(next);
    setMsg({ ok: true, text: t(locale, next ? "sf.twostep.nowOn" : "sf.twostep.nowOff") });
  }

  return (
    <div className="max-w-md">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(locale, "sf.twostep.explain")}{" "}
        <span className="text-foreground" dir="ltr">
          {email}
        </span>
        .
      </p>
      <label className="mt-4 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="h-[18px] w-[18px] shrink-0 accent-foreground"
          checked={enabled}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
        {t(locale, "sf.twostep.label")}
      </label>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-xs ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
