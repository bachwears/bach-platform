"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";

export function AccountLink() {
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
      href={signedIn ? "/account" : "/account/login"}
      className="text-muted-foreground hover:text-foreground"
    >
      {signedIn ? "Account" : "Sign in"}
    </Link>
  );
}
