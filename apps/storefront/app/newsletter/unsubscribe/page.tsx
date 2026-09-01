"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t } from "@bach/i18n";

import { useLocale } from "../../../lib/locale-client";

function UnsubscribeForm() {
  const locale = useLocale();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("e") ?? "");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function unsubscribe() {
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || state === "busy") return;
    setState("busy");
    const { error } = await supabaseBrowser().rpc("unsubscribe_newsletter", { p_email: value });
    setState(error ? "error" : "done");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "sf.unsub.title")}</h1>
      {state === "done" ? (
        <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.unsub.done")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.unsub.sub")}</p>
          <div className="mt-6 flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              dir="ltr"
              placeholder={t(locale, "sf.nl.placeholder")}
              onKeyDown={(e) => e.key === "Enter" && void unsubscribe()}
            />
            <Button disabled={state === "busy"} onClick={() => void unsubscribe()}>
              {t(locale, "sf.unsub.cta")}
            </Button>
          </div>
          {state === "error" && <p className="mt-3 text-sm text-destructive">{t(locale, "sf.nl.failed")}</p>}
        </>
      )}
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense>
        <UnsubscribeForm />
      </Suspense>
    </div>
  );
}
