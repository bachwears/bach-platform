"use client";

import { Cake } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";

export function BirthdayPopup() {
  const [offer, setOffer] = useState<{ code: string; percent: number } | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function checkOffer() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const today = new Date().toISOString().slice(0, 10);
      try {
        if (localStorage.getItem("bach-bday-popup") === today) return;
      } catch {
        /* show anyway */
      }
      const { data } = await supabase.rpc("my_birthday_offer");
      const o = data?.[0];
      if (o?.in_window && !o.already_used) {
        // Mark seen on show, not on dismiss — otherwise navigating away
        // without closing re-triggers the popup on every page.
        try {
          localStorage.setItem("bach-bday-popup", today);
        } catch {
          /* fine */
        }
        setOffer({ code: String(o.code).toUpperCase(), percent: o.percent });
      }
    }
    void checkOffer();
  }, []);

  if (!offer) return null;

  function dismiss() {
    try {
      localStorage.setItem("bach-bday-popup", new Date().toISOString().slice(0, 10));
    } catch {
      /* fine */
    }
    setOffer(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={dismiss}>
      <div
        className="w-full max-w-sm border bg-background p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Cake className="mx-auto h-7 w-7" strokeWidth={1} aria-hidden />
        <h2 className="type-display mt-4 text-3xl">Happy birthday from BACH.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enjoy <span className="font-medium text-foreground">{offer.percent}% off everything</span> with
          code <span className="font-mono font-medium text-foreground">{offer.code}</span> — our gift,
          valid for a few days around your day.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/shop"
            onClick={dismiss}
            className="type-label grid h-12 w-full place-items-center bg-foreground text-background hover:opacity-90"
          >
            Shop the collection
          </Link>
          <button type="button" className="type-meta h-10 underline underline-offset-4 hover:opacity-60" onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
