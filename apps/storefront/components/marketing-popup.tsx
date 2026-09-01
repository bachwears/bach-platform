"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";

interface Popup {
  id: string;
  title_en: string;
  body_en: string;
  cta_text: string | null;
  cta_href: string | null;
}

export function MarketingPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);

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

  if (!popup) return null;

  function dismiss() {
    try {
      localStorage.setItem(`bach-popup-${popup!.id}`, "1");
    } catch {
      /* fine */
    }
    setPopup(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={dismiss}>
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold tracking-tight">{popup.title_en}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{popup.body_en}</p>
        <div className="mt-6 flex flex-col gap-2">
          {popup.cta_href ? (
            <Link href={popup.cta_href} onClick={dismiss}>
              <Button className="w-full">{popup.cta_text ?? "Shop now"}</Button>
            </Link>
          ) : (
            <Link href="/shop" onClick={dismiss}>
              <Button className="w-full">{popup.cta_text ?? "Shop the collection"}</Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
