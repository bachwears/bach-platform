"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";

/*
 * MGMT sign-in, in the storefront's email-first rhythm: the email on its own,
 * then the password under it. Same sign-in as the shared LoginForm
 * (signInWithPassword + a hard navigation so middleware sees the new session).
 */
const INPUT =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";
const PRIMARY = "h-12 w-full bg-foreground text-sm text-background hover:opacity-90 disabled:opacity-40";

export function MgmtLoginForm() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const focusRef = useRef<HTMLInputElement>(null);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  useEffect(() => {
    focusRef.current?.focus();
  }, [step]);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError("الإيميل أو كلمة السر مش صح، جرّب مرة تانية");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-bach.png" alt="BACH" className="mx-auto h-6 w-auto dark:invert" />
        <h1 className="mt-6 text-lg font-normal">دخول الإدارة</h1>
        <p className="mt-1 text-sm text-muted-foreground">فوت بإيميل الشغل تبعك.</p>
      </div>

      <form
        className="mt-10 space-y-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "email") {
            if (emailOk) setStep("password");
          } else if (password && !busy) void signIn();
        }}
      >
        {step === "email" ? (
          <>
            <label className="block">
              <span className="text-xs text-muted-foreground">الإيميل</span>
              <input
                ref={focusRef}
                className={INPUT}
                type="email"
                inputMode="email"
                autoComplete="username"
                dir="ltr"
                placeholder="name@bachwears.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button type="submit" className={PRIMARY} disabled={!emailOk}>
              كمّل
            </button>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 border-b pb-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">الإيميل</p>
                <p className="mt-1 truncate text-sm" dir="ltr">
                  {email.trim()}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs underline underline-offset-4 hover:opacity-60"
                onClick={() => {
                  setPassword("");
                  setError(null);
                  setStep("email");
                }}
              >
                غيّر الإيميل
              </button>
            </div>
            {/* hidden username field so password managers pair the email */}
            <input type="email" value={email} autoComplete="username" readOnly hidden />
            <label className="block">
              <span className="text-xs text-muted-foreground">كلمة السر</span>
              <input
                ref={focusRef}
                className={INPUT}
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <button type="submit" className={PRIMARY} disabled={!password || busy}>
              {busy ? "عم نسجّل دخولك…" : "سجّل الدخول"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              نسيت كلمة السر؟ احكي السوبر أدمن يعطيك وحدة مؤقتة.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
