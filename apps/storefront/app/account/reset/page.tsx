"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../../lib/locale-client";

type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const [state, setState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");

    // A token_hash link (custom email template) verifies here; the default
    // ?code= link is exchanged by the browser client itself on load, which
    // needs the verifier stored when the reset was requested on this device.
    const verify = tokenHash
      ? supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ error: e }) => !e)
      : new Promise<boolean>((resolve) => {
          const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
              sub.subscription.unsubscribe();
              resolve(true);
            }
          });
          void supabase.auth.getSession().then(({ data }) => {
            if (data.session) resolve(true);
          });
          setTimeout(() => resolve(false), 6000);
        });

    let live = true;
    void verify.then((ok) => live && setState(ok ? "ready" : "invalid"));
    return () => {
      live = false;
    };
  }, []);

  const canSave = !busy && password.length >= 8 && password === confirm;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(t(locale, "sf.reset.failed", { m: err.message }));
      return;
    }
    router.replace(lhref(locale, "/account"));
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
        <h1 className="type-heading">{t(locale, "sf.reset.title")}</h1>

        {state === "checking" && <p className="mt-4 text-sm text-muted-foreground">{t(locale, "sf.reset.checking")}</p>}

        {state === "invalid" && (
          <div className="mt-4 space-y-3">
            <p className="text-muted-foreground">{t(locale, "sf.reset.invalid")}</p>
            <Link href={lhref(locale, "/account/forgot")} className="inline-block py-2 text-sm underline underline-offset-4">
              {t(locale, "sf.reset.again")}
            </Link>
          </div>
        )}

        {state === "ready" && (
          <div className="mt-8 space-y-6 [&_input]:h-11 [&_input]:border-0 [&_input]:border-b [&_input]:bg-transparent [&_input]:px-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0">
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.reset.password")}</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.confirm")}</span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && void save()}
              />
            </label>
            {password && confirm && password !== confirm && (
              <p className="text-sm text-destructive">{t(locale, "sf.new.noMatch")}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="type-label h-12 w-full" disabled={!canSave} onClick={() => void save()}>
              {busy ? t(locale, "sf.reset.saving") : t(locale, "sf.reset.save")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
