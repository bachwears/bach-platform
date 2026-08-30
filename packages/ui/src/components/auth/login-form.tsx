"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";

import { Button } from "../button";
import { Input } from "../input";

export function LoginForm({ appTitle }: { appTitle: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("البريد أو كلمة السر مش صح، جرّب مرة تانية");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{appTitle}</h1>
        <p className="text-sm text-muted-foreground">سجّل دخولك لتكمّل</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          البريد الإلكتروني
        </label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          كلمة السر
        </label>
        <Input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "عم نسجّل دخولك…" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
