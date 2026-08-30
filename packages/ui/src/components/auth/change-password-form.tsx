"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";

import { Button } from "../button";
import { Input } from "../input";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("كلمة السر لازم تكون 8 أحرف عالأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا السر مش متطابقتين");
      return;
    }

    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        updateError.message.includes("different from the old")
          ? "كلمة السر الجديدة لازم تكون غير القديمة"
          : "صار خطأ، جرّب مرة تانية",
      );
      setBusy(false);
      return;
    }
    await supabase.rpc("password_changed");
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">غيّر كلمة السر</h1>
        <p className="text-sm text-muted-foreground">
          لأمان حسابك، لازم تغيّر كلمة السر المؤقتة قبل ما تكمّل
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="new-password">
          كلمة السر الجديدة
        </label>
        <Input
          id="new-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirm-password">
          تأكيد كلمة السر
        </label>
        <Input
          id="confirm-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "عم نحفظ…" : "حفظ وكمّل"}
      </Button>
    </form>
  );
}
