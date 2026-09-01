"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../../lib/locale-client";

export default function NewAccountPage() {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bach-checkout-info");
      if (raw) {
        const info = JSON.parse(raw) as { name?: string; phone?: string; email?: string };
        setName(info.name ?? "");
        setPhone(info.phone ?? "");
        setEmail(info.email ?? "");
      }
    } catch {
      /* nothing to prefill */
    }
  }, []);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canCreate =
    !busy && name.trim() && emailOk && password.length >= 8 && password === confirm;

  async function create() {
    if (!canCreate) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim(), phone },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("already registered")
          ? t(locale, "sf.new.exists")
          : t(locale, "sf.new.failed", { m: err.message }),
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-dvh bg-background">
        <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {t(locale, "sf.new.doneEyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t(locale, "sf.new.doneTitle")}</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t(locale, "sf.new.doneBody1")}{" "}
              <span className="font-medium text-foreground" dir="ltr">
                {email.trim()}
              </span>
              . {t(locale, "sf.new.doneBody2")}
            </p>
            <Link href={lhref(locale, "/shop")} className="mt-8 inline-block underline underline-offset-4">
              {t(locale, "sf.confirmed.continue")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.new.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.new.sub")}</p>

        <div className="mt-8 space-y-4">
          <Field label={t(locale, "sf.new.name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t(locale, "sf.new.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" />
          </Field>
          <Field label={t(locale, "sf.new.email")}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" dir="ltr" />
          </Field>
          <Field label={t(locale, "sf.new.password")}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t(locale, "sf.new.confirm")}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          {password && confirm && password !== confirm && (
            <p className="text-sm text-destructive">{t(locale, "sf.new.noMatch")}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full text-base" disabled={!canCreate} onClick={() => void create()}>
            {busy ? t(locale, "sf.new.creating") : t(locale, "sf.new.create")}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
