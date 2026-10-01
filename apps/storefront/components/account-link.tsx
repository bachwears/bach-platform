"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../lib/locale-client";

/** "Log in" until there's a session, then "Account". The icon variant wraps the caller's icon. */
export function AccountLink({
  variant,
  className = "",
  children,
}: {
  variant: "text" | "icon";
  className?: string;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const label = t(locale, signedIn ? "sf.nav.account" : "sf.nav.login");
  return (
    <Link
      href={lhref(locale, signedIn ? "/account" : "/account/login")}
      aria-label={variant === "icon" ? label : undefined}
      className={className}
    >
      {variant === "icon" ? children : label}
    </Link>
  );
}
