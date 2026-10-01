"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
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

  return (
    <>
      <h2 className="mt-10 text-lg font-medium">{t(locale, "sf.acct.password")}</h2>
      <div className="mt-4 space-y-4 rounded-md border p-5 text-sm [&_input]:h-11 lg:[&_input]:h-9">
        <label className="block space-y-1.5">
          <span className="font-medium">{t(locale, "sf.acct.pwCurrent")}</span>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium">{t(locale, "sf.acct.pwNew")}</span>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium">{t(locale, "sf.acct.pwConfirm")}</span>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && void change()}
          />
        </label>
        {mismatch && <p className="text-destructive">{t(locale, "sf.new.noMatch")}</p>}
        {msg && <p className={msg.ok ? "text-muted-foreground" : "text-destructive"}>{msg.text}</p>}
        <Button className="h-11 lg:h-9" disabled={!canSave} onClick={() => void change()}>
          {busy ? t(locale, "sf.acct.pwSaving") : t(locale, "sf.acct.pwSave")}
        </Button>
      </div>
    </>
  );
}
