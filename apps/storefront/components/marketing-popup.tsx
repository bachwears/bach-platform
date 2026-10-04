"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";

import { ModalShell, useInPurchase } from "./modal-shell";

interface Popup {
  id: string;
  title_en: string;
  body_en: string;
  cta_text: string | null;
  cta_href: string | null;
}

export function MarketingPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const inPurchase = useInPurchase();

  useEffect(() => {
    async function check() {
      const { data } = await supabaseBrowser()
        .from("popups")
        .select("id, title_en, body_en, cta_text, cta_href")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      for (const p of data ?? []) {
        try {
          if (localStorage.getItem(`bach-popup-${p.id}`)) continue;
        } catch {
          /* show anyway */
        }
        setPopup(p as Popup);
        return;
      }
    }
    void check();
  }, []);

  if (!popup || inPurchase) return null;

  function dismiss() {
    try {
      localStorage.setItem(`bach-popup-${popup!.id}`, "1");
    } catch {
      /* fine */
    }
    setPopup(null);
  }

  return (
    <ModalShell label={popup.title_en} onClose={dismiss}>
        <h2 className="type-display text-3xl">{popup.title_en}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{popup.body_en}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={popup.cta_href || "/shop"}
            onClick={dismiss}
            className="type-label grid h-12 w-full place-items-center bg-foreground text-background hover:opacity-90"
          >
            {popup.cta_text ?? (popup.cta_href ? "Shop now" : "Shop the collection")}
          </Link>
          <button type="button" className="type-meta h-10 underline underline-offset-4 hover:opacity-60" onClick={dismiss}>
            Dismiss
          </button>
        </div>
    </ModalShell>
  );
}
