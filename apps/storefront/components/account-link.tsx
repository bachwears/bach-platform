"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../lib/locale-client";

export function AccountLink({ className = "" }: { className?: string }) {
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

  return (
    <Link
      href={lhref(locale, signedIn ? "/account" : "/account/login")}
      aria-label={t(locale, "sf.nav.account")}
      className={`grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground ${className}`}
    >
      <User className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );
}
