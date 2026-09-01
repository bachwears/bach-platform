"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../../lib/locale-client";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = !busy && email.trim() && password;

  async function signIn() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("Invalid login")
          ? t(locale, "sf.login.wrong")
          : err.message.includes("not confirmed")
            ? t(locale, "sf.login.unconfirmed")
            : t(locale, "sf.login.failed", { m: err.message }),
      );
      return;
    }
    router.replace(lhref(locale, "/account"));
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.login.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.login.sub")}</p>

        <div className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t(locale, "sf.login.email")}</span>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && void signIn()}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t(locale, "sf.login.password")}</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && void signIn()}
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full text-base" disabled={!canSubmit} onClick={() => void signIn()}>
            {busy ? t(locale, "sf.login.signingIn") : t(locale, "sf.login.signIn")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t(locale, "sf.login.newTo")}{" "}
            <Link href={lhref(locale, "/account/new")} className="underline underline-offset-4">
              {t(locale, "sf.login.create")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
