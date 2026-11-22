"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { useLocale } from "../lib/locale-client";
import { track } from "../lib/track";

/**
 * "International delivery is coming soon" (checkout, while delivery is
 * Lebanon-only): instead of an order the shop would cancel, the shopper leaves
 * an email or WhatsApp number to hear the day it opens
 * (join_international_waitlist; read in MGMT → محتوى الموقع).
 */
export function IntlWaitlist({
  id,
  name,
  email: initialEmail,
  phone: initialPhone,
  bagCents,
}: {
  id?: string;
  name: string;
  email: string;
  phone: string;
  bagCents: number;
}) {
  const locale = useLocale();
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // The box opens while the shopper is still typing the checkout's phone/email:
  // keep following those until they type into these fields themselves.
  const edited = useRef({ email: false, phone: false });
  useEffect(() => {
    if (!edited.current.email) setEmail(initialEmail);
  }, [initialEmail]);
  useEffect(() => {
    if (!edited.current.phone) setPhone(initialPhone);
  }, [initialPhone]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    const ph = phone.trim();
    if (!em && !ph) {
      setState("error");
      setMessage(t(locale, "sf.intl.needContact"));
      return;
    }
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setState("error");
      setMessage(t(locale, "sf.co.errEmail"));
      return;
    }
    setState("busy");
    const { error } = await supabaseBrowser().rpc("join_international_waitlist", {
      p_name: name.trim() || null,
      p_email: em || null,
      p_phone: ph || null,
      p_bag_usd_cents: bagCents || null,
    });
    if (error) {
      setState("error");
      setMessage(/phone/.test(error.message) ? t(locale, "sf.co.errPhone") : t(locale, "sf.intl.failed"));
      return;
    }
    track("checkout_step", { source: "waitlist" });
    setState("done");
  }

  return (
    <section id={id} className="space-y-4 border border-foreground p-5" aria-live="polite">
      <h2 className="type-label">{t(locale, "sf.intl.title")}</h2>
      {state === "done" ? (
        <p className="text-sm">{t(locale, "sf.intl.done")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t(locale, "sf.intl.body")}</p>
          <form onSubmit={join} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="type-meta text-muted-foreground">{t(locale, "sf.intl.email")}</span>
                <input
                  className={INPUT}
                  value={email}
                  onChange={(e) => {
                    edited.current.email = true;
                    setEmail(e.target.value);
                  }}
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className="type-meta text-muted-foreground">{t(locale, "sf.intl.whatsapp")}</span>
                <input
                  className={INPUT}
                  value={phone}
                  onChange={(e) => {
                    edited.current.phone = true;
                    setPhone(e.target.value);
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+966 5x xxx xxxx"
                  dir="ltr"
                />
              </label>
            </div>
            {state === "error" ? <p className="text-xs text-destructive">{message}</p> : null}
            <button
              type="submit"
              disabled={state === "busy"}
              className="type-label h-11 w-full border border-foreground bg-foreground text-background hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-8"
            >
              {state === "busy" ? t(locale, "sf.intl.sending") : t(locale, "sf.intl.cta")}
            </button>
            <p className="text-xs text-muted-foreground">{t(locale, "sf.intl.privacy")}</p>
          </form>
        </>
      )}
    </section>
  );
}

const INPUT =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";
