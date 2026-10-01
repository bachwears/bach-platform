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
    return <p className="type-meta">{t(locale, "sf.nl.done")}</p>;
  }

  return (
    <form onSubmit={(e) => void subscribe(e)} className="space-y-2">
      <div className="flex items-end gap-6">
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
          className="type-label h-11 min-w-0 flex-1 border-0 border-b border-foreground bg-transparent px-0 normal-case outline-none placeholder:uppercase placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="type-label h-11 shrink-0 px-1 hover:opacity-60 disabled:opacity-40"
        >
          {t(locale, "sf.nl.cta")}
        </button>
      </div>
      {state === "error" && <p className="text-sm text-destructive">{message}</p>}
      <p className="pt-1 text-xs text-muted-foreground">{t(locale, "sf.nl.consent")}</p>
    </form>
  );
}
