"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../lib/locale-client";

type Step = "email" | "password" | "code" | "register";

// Supabase lets an email code be re-sent once a minute.
const RESEND_SECONDS = 60;

const INPUT =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";
const PRIMARY = "type-label h-12 w-full bg-foreground text-background hover:opacity-90 disabled:opacity-40";
const SECONDARY = "type-label grid h-12 w-full place-items-center border border-foreground hover:bg-secondary";

/**
 * One page to log in or register, email first. We deliberately do not look
 * the email up (that would reveal who has an account): the email step leads
 * to the password, with registration one tap away carrying the email over.
 *
 * Two-step sign-in (opt-in from the account page): once the password is right,
 * that session is dropped straight away and a 6-digit code is emailed; the
 * session that counts is the one verifyOtp creates from the code.
 */
export function AuthFlow({ initial }: { initial: "email" | "register" }) {
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<Step>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [next, setNext] = useState("/account");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const focusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    // same-site paths only: resolve it the way the browser will (so "/\\evil.com"
    // or "//evil.com" can't slip through) and keep it only if the origin is ours
    if (n) {
      try {
        const u = new URL(n, window.location.origin);
        if (u.origin === window.location.origin && n.startsWith("/")) setNext(u.pathname + u.search + u.hash);
      } catch {
        /* not a URL — keep the default */
      }
    }
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

  useEffect(() => {
    focusRef.current?.focus();
    setError("");
  }, [step]);

  // resend countdown, only while the code step is on screen
  useEffect(() => {
    if (step !== "code") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSignIn = !busy && emailOk && password;
  const canCreate = !busy && name.trim() && emailOk && password.length >= 8 && password === confirm;
  const canVerify = !busy && /^\d{6}$/.test(code);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function signIn() {
    if (!canSignIn) return;
    setBusy(true);
    setError("");
    const supabase = supabaseBrowser();
    const address = email.trim().toLowerCase();
    const { error: err } = await supabase.auth.signInWithPassword({ email: address, password });
    // With the auth hook on, Supabase itself refuses a password-only session for
    // two-step customers (after checking the password): go straight to the code.
    if (err && err.message.includes("two_step_required")) {
      const sent = await sendCode();
      setBusy(false);
      if (sent) {
        setPassword("");
        setCode("");
        setStep("code");
      }
      return;
    }
    if (err) {
      setBusy(false);
      setError(
        err.message.includes("Invalid login")
          ? t(locale, "sf.login.wrong")
          : err.message.includes("not confirmed")
            ? t(locale, "sf.login.unconfirmed")
            : t(locale, "sf.login.failed", { m: err.message }),
      );
      return;
    }
    // Password is right. Does this customer want an email code as well?
    const { data: twoStep, error: lookupErr } = await supabase.rpc("two_step_required", { p_email: address });
    // PGRST202: the lookup isn't deployed yet, so nobody can have switched it on
    if ((lookupErr && lookupErr.code !== "PGRST202") || twoStep === true) {
      await supabase.auth.signOut({ scope: "local" });
      if (lookupErr) {
        setBusy(false);
        setError(lookupErr.message.includes("too many") ? t(locale, "sf.twostep.tooMany") : t(locale, "sf.twostep.lookupFailed"));
        return;
      }
      const sent = await sendCode();
      setBusy(false);
      if (sent) {
        setPassword("");
        setCode("");
        setStep("code");
      }
      return;
    }
    setBusy(false);
    router.replace(lhref(locale, next));
  }

  /** Email the 6-digit code (never creates an account). */
  async function sendCode(): Promise<boolean> {
    const { error: err } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (err) {
      setError(
        err.status === 429 || /seconds|rate limit/i.test(err.message)
          ? t(locale, "sf.twostep.wait")
          : t(locale, "sf.twostep.sendFailed", { m: err.message }),
      );
      return false;
    }
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
    setNow(Date.now());
    return true;
  }

  async function resend() {
    if (busy || resendIn > 0) return;
    setBusy(true);
    setError("");
    const sent = await sendCode();
    setBusy(false);
    if (sent) setCode("");
  }

  async function verify() {
    if (!canVerify) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabaseBrowser().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });
    setBusy(false);
    if (err) {
      // Supabase answers the same for a wrong and an expired code
      setError(err.status === 429 ? t(locale, "sf.twostep.tooMany") : t(locale, "sf.twostep.badCode"));
      return;
    }
    router.replace(lhref(locale, next));
  }

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
      setError(err.message.includes("already registered") ? t(locale, "sf.new.exists") : t(locale, "sf.new.failed", { m: err.message }));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
        <p className="type-meta text-muted-foreground">{t(locale, "sf.new.doneEyebrow")}</p>
        <h1 className="type-heading mt-3">{t(locale, "sf.new.doneTitle")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t(locale, "sf.new.doneBody1")}{" "}
          <span className="text-foreground" dir="ltr">
            {email.trim()}
          </span>
          . {t(locale, "sf.new.doneBody2")}
        </p>
        <Link href={lhref(locale, "/shop")} className={`${SECONDARY} mt-10`}>
          {t(locale, "sf.confirmed.continue")}
        </Link>
      </main>
    );
  }

  const emailRow = (
    <div className="flex items-end justify-between gap-4 border-b pb-3">
      <div className="min-w-0">
        <p className="type-meta text-muted-foreground">{t(locale, "sf.login.email")}</p>
        <p className="mt-1 truncate text-sm" dir="ltr">
          {email.trim()}
        </p>
      </div>
      <button type="button" className="type-meta shrink-0 underline underline-offset-4 hover:opacity-60" onClick={() => setStep("email")}>
        {t(locale, "sf.auth.change")}
      </button>
    </div>
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
      <h1 className="type-heading">
        {step === "register" ? t(locale, "sf.new.title") : step === "code" ? t(locale, "sf.twostep.codeTitle") : t(locale, "sf.auth.title")}
      </h1>
      {step === "register" ? <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.new.sub")}</p> : null}

      <form
        className="mt-10 space-y-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "email" && emailOk) setStep("password");
          else if (step === "password") void signIn();
          else if (step === "code") void verify();
          else if (step === "register") void create();
        }}
      >
        {step === "email" ? (
          <>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.login.email")}</span>
              <input
                ref={focusRef}
                className={INPUT}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
              />
            </label>
            <button type="submit" className={PRIMARY} disabled={!emailOk}>
              {t(locale, "sf.auth.continue")}
            </button>
          </>
        ) : step === "password" ? (
          <>
            {emailRow}
            {/* hidden username field so password managers pair the email */}
            <input type="email" value={email} autoComplete="username" readOnly hidden />
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.login.password")}</span>
              <input
                ref={focusRef}
                className={INPUT}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <Link href={lhref(locale, "/account/forgot")} className="type-meta -mt-4 inline-block underline underline-offset-4 hover:opacity-60">
              {t(locale, "sf.login.forgot")}
            </Link>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" className={PRIMARY} disabled={!canSignIn}>
              {busy ? t(locale, "sf.login.signingIn") : t(locale, "sf.login.signIn")}
            </button>
            <div className="border-t pt-8">
              <p className="type-meta text-muted-foreground">{t(locale, "sf.auth.newHere")}</p>
              <button type="button" className={`${SECONDARY} mt-4`} onClick={() => setStep("register")}>
                {t(locale, "sf.auth.createInstead")}
              </button>
            </div>
          </>
        ) : step === "code" ? (
          <>
            {emailRow}
            <p className="text-xs leading-relaxed text-muted-foreground">{t(locale, "sf.twostep.codeSent")}</p>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.twostep.code")}</span>
              <input
                ref={focusRef}
                className={`${INPUT} tracking-[0.3em] tabular-nums`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <button type="submit" className={PRIMARY} disabled={!canVerify}>
              {busy ? t(locale, "sf.twostep.verifying") : t(locale, "sf.twostep.verify")}
            </button>
            <button
              type="button"
              className="type-meta underline underline-offset-4 hover:opacity-60 disabled:no-underline disabled:opacity-40"
              disabled={busy || resendIn > 0}
              onClick={() => void resend()}
            >
              {resendIn > 0 ? t(locale, "sf.twostep.resendIn", { s: resendIn }) : t(locale, "sf.twostep.resend")}
            </button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.email")}</span>
              <input
                className={INPUT}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.name")}</span>
              <input ref={focusRef} className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.phone")}</span>
              <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" />
            </label>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.password")}</span>
              <input className={INPUT} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.new.confirm")}</span>
              <input className={INPUT} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            {password && confirm && password !== confirm && <p className="text-xs text-destructive">{t(locale, "sf.new.noMatch")}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" className={PRIMARY} disabled={!canCreate}>
              {busy ? t(locale, "sf.new.creating") : t(locale, "sf.new.create")}
            </button>
            <div className="border-t pt-8">
              <p className="type-meta text-muted-foreground">{t(locale, "sf.new.have")}</p>
              <button type="button" className={`${SECONDARY} mt-4`} onClick={() => setStep(emailOk ? "password" : "email")}>
                {t(locale, "sf.login.signIn")}
              </button>
            </div>
          </>
        )}
      </form>

      <Link href={lhref(locale, "/help")} className="type-meta mt-12 inline-block text-muted-foreground underline underline-offset-4 hover:text-foreground">
        {t(locale, "sf.nav.help")}
      </Link>
    </main>
  );
}
