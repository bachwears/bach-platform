"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../../lib/locale-client";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSend = !busy && /\S+@\S+\.\S+/.test(email.trim());

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}${lhref(locale, "/account/reset")}`,
    });
    setBusy(false);
    // Same answer whether or not the address has an account, so the form can't be used to probe emails.
    if (err && !/not found|no user/i.test(err.message)) {
      setError(t(locale, "sf.forgot.failed"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
        <h1 className="type-heading">{t(locale, "sf.forgot.title")}</h1>
        {sent ? (
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {t(locale, "sf.forgot.sent", { e: email.trim() })}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.forgot.sub")}</p>
            <div className="mt-8 space-y-6 [&_input]:h-11 [&_input]:border-0 [&_input]:border-b [&_input]:bg-transparent [&_input]:px-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0">
              <label className="block">
                <span className="type-meta text-muted-foreground">{t(locale, "sf.login.email")}</span>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="type-label h-12 w-full" disabled={!canSend} onClick={() => void send()}>
                {busy ? t(locale, "sf.forgot.sending") : t(locale, "sf.forgot.send")}
              </Button>
            </div>
          </>
        )}
        <Link
          href={lhref(locale, "/account/login")}
          className="mt-6 inline-block py-2 text-sm underline underline-offset-4"
        >
          {t(locale, "sf.forgot.back")}
        </Link>
      </main>
    </div>
  );
}
