"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Share, X } from "lucide-react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { CartLink } from "./cart-link";
import { lhref, useLocale } from "../lib/locale-client";

/** Lets the top bar and the buy box keep one saved/not-saved state. */
export const WISHLIST_EVENT = "bach-wishlist";

/**
 * Product page bar on phones (reference: Zara): close on the left; save, share
 * and the bag on the right. Replaces the site header there; desktop keeps it.
 */
export function PdpTopBar({ productId, name }: { productId: string; name: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    void (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setSignedIn(!!sess.session);
      if (!sess.session) return;
      const { data: cid } = await supabase.rpc("my_customer_id");
      if (!cid) return;
      setCustomerId(cid as string);
      const { data: w } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("customer_id", cid)
        .eq("product_id", productId)
        .maybeSingle();
      setSaved(!!w);
    })();
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ productId: string; saved: boolean }>).detail;
      if (d?.productId === productId) setSaved(d.saved);
    };
    window.addEventListener(WISHLIST_EVENT, onChange);
    return () => window.removeEventListener(WISHLIST_EVENT, onChange);
  }, [productId]);

  function close() {
    // back to where they came from on this site, else the shop
    const fromHere = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (fromHere && window.history.length > 1) router.back();
    else router.push(lhref(locale, "/shop"));
  }

  async function toggleSave() {
    if (!signedIn || !customerId) {
      router.push(lhref(locale, `/account/login?next=${encodeURIComponent(window.location.pathname)}`));
      return;
    }
    const next = !saved;
    const announce = (v: boolean) =>
      window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: { productId, saved: v } }));
    setFailed(false);
    setSaved(next);
    announce(next);
    const supabase = supabaseBrowser();
    const { error } = next
      ? await supabase.from("wishlists").insert({ customer_id: customerId, product_id: productId })
      : await supabase.from("wishlists").delete().eq("customer_id", customerId).eq("product_id", productId);
    // 23505: already saved elsewhere — keep it; anything else rolls back
    if (error && error.code !== "23505") {
      setSaved(!next);
      announce(!next);
      setFailed(true);
      setTimeout(() => setFailed(false), 3000);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — BACH Wears`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* share sheet dismissed */
    }
  }

  const icon = "grid h-11 w-11 place-items-center";
  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-background px-2 md:hidden">
      <button type="button" aria-label={t(locale, "sf.nav.close")} className={icon} onClick={close}>
        <X className="h-6 w-6" strokeWidth={1} aria-hidden />
      </button>
      <div className="flex items-center">
        {failed ? (
          <span role="alert" className="type-meta me-1 text-destructive">
            {t(locale, "sf.pdp.wishErrorShort")}
          </span>
        ) : copied ? (
          <span className="type-meta me-1 text-muted-foreground">{t(locale, "sf.pdp.linkCopied")}</span>
        ) : null}
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? t(locale, "sf.pdp.wishSaved") : t(locale, "sf.pdp.wishSave")}
          className={icon}
          onClick={() => void toggleSave()}
        >
          <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} strokeWidth={1.25} aria-hidden />
        </button>
        <button type="button" aria-label={t(locale, "sf.pdp.share")} className={icon} onClick={() => void share()}>
          <Share className="h-5 w-5" strokeWidth={1.25} aria-hidden />
        </button>
        <CartLink variant="box" className={icon} />
      </div>
    </div>
  );
}
