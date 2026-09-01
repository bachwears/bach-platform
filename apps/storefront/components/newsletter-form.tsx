"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { useLocale } from "../lib/locale-client";

export function NewsletterForm() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState("error");
      setMessage(t(locale, "sf.nl.invalid"));
      return;
    }
    setState("busy");
    const { error } = await supabaseBrowser().rpc("subscribe_newsletter", {
      p_email: value,
      p_locale: locale,
    });
    if (error) {
      setState("error");
      setMessage(t(locale, "sf.nl.failed"));
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return <p className="text-sm text-green-600 dark:text-green-400">{t(locale, "sf.nl.done")}</p>;
  }

  return (
    <form onSubmit={(e) => void subscribe(e)} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setState("idle");
          }}
          placeholder={t(locale, "sf.nl.placeholder")}
          aria-label={t(locale, "sf.nl.placeholder")}
          dir="ltr"
          className="h-10 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
        >
          {t(locale, "sf.nl.cta")}
        </button>
      </div>
      {state === "error" && <p className="text-sm text-destructive">{message}</p>}
      <p className="text-xs text-muted-foreground">{t(locale, "sf.nl.consent")}</p>
    </form>
  );
}
