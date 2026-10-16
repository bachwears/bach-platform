"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../../../lib/locale-client";

/**
 * Where the "Confirm your email" link lands. The email carries a token_hash
 * that verifies here, in whatever browser or mail app opens it (Supabase's own
 * redirect link only works in the browser that signed up). Confirming also
 * signs the customer in, so they go straight to their account.
 */
export default function ConfirmEmailPage() {
  const router = useRouter();
  const locale = useLocale();
  const [state, setState] = useState<"checking" | "invalid">("checking");

  useEffect(() => {
    const supabase = supabaseBrowser();
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") === "signup" ? "signup" : "email";
    let live = true;
    void (async () => {
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        if (!error) return live && router.replace(lhref(locale, "/account"));
      }
      // An already-used link: the address is confirmed, the customer just isn't signed in here.
      const { data } = await supabase.auth.getSession();
      if (!live) return;
      if (data.session) router.replace(lhref(locale, "/account"));
      else setState("invalid");
    })();
    return () => {
      live = false;
    };
  }, [locale, router]);

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
        <h1 className="type-heading">{t(locale, "sf.confirm.title")}</h1>
        {state === "checking" ? (
          <p className="mt-4 text-sm text-muted-foreground">{t(locale, "sf.confirm.checking")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-muted-foreground">{t(locale, "sf.confirm.invalid")}</p>
            <Link
              href={lhref(locale, "/account/login")}
              className="type-meta inline-block py-2 text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t(locale, "sf.login.signIn")}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
