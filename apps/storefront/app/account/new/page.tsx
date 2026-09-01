"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";


export default function NewAccountPage() {
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
          ? "This email already has an account."
          : `Could not create your account: ${err.message}`,
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
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Almost there</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Check your inbox.</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email.trim()}</span>.
              Click it to activate your BACH account — your orders will be linked automatically.
            </p>
            <Link href="/shop" className="mt-8 inline-block underline underline-offset-4">
              Continue shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track orders, faster checkout, and member perks to come.
        </p>

        <div className="mt-8 space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" dir="ltr" />
          </Field>
          <Field label="Password (8+ characters)">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          {password && confirm && password !== confirm && (
            <p className="text-sm text-destructive">Passwords don&apos;t match.</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-12 w-full text-base" disabled={!canCreate} onClick={() => void create()}>
            {busy ? "Creating…" : "Create account"}
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
