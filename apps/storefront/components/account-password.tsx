"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t, type Locale } from "@bach/i18n";

export function AccountPassword({ locale, email }: { locale: Locale; email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mismatch = Boolean(next && confirm && next !== confirm);
  const canSave = !busy && current && next.length >= 8 && next === confirm;

  async function change() {
    if (!canSave) return;
    setBusy(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    // An open session alone shouldn't be enough to take over the account.
    const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
    if (wrong) {
      setBusy(false);
      setMsg({ ok: false, text: t(locale, "sf.acct.pwWrong") });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: t(locale, "sf.acct.pwFailed", { m: error.message }) });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg({ ok: true, text: t(locale, "sf.acct.pwDone") });
  }

  const field =
    "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors focus:border-foreground";
  return (
    <div className="max-w-md space-y-6 text-sm">
      <label className="block">
        <span className="type-meta text-muted-foreground">{t(locale, "sf.acct.pwCurrent")}</span>
        <input className={field} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </label>
      <label className="block">
        <span className="type-meta text-muted-foreground">{t(locale, "sf.acct.pwNew")}</span>
        <input className={field} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="type-meta text-muted-foreground">{t(locale, "sf.acct.pwConfirm")}</span>
        <input
          className={field}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          onKeyDown={(e) => e.key === "Enter" && void change()}
        />
      </label>
      {mismatch && <p className="text-xs text-destructive">{t(locale, "sf.new.noMatch")}</p>}
      {msg && <p className={`text-xs ${msg.ok ? "text-muted-foreground" : "text-destructive"}`}>{msg.text}</p>}
      <button
        type="button"
        className="type-label h-12 w-full bg-foreground text-background hover:opacity-90 disabled:opacity-40"
        disabled={!canSave}
        onClick={() => void change()}
      >
        {busy ? t(locale, "sf.acct.pwSaving") : t(locale, "sf.acct.pwSave")}
      </button>
    </div>
  );
}
