"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";

import { lhref, useLocale } from "../lib/locale-client";

export function AccountLink() {
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

  const label = signedIn
    ? locale === "ar"
      ? "حسابي"
      : "Account"
    : locale === "ar"
      ? "تسجيل الدخول"
      : "Sign in";
  return (
    <Link
      href={lhref(locale, signedIn ? "/account" : "/account/login")}
      className="text-muted-foreground hover:text-foreground"
    >
      {label}
    </Link>
  );
}
