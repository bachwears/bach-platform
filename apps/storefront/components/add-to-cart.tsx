"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

import { t } from "@bach/i18n";

import { addToCart } from "../lib/cart";
import { lhref, useLocale } from "../lib/locale-client";

export interface PdpVariant {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  color_ar?: string | null;
  available: number;
}

export function AddToCart({ variants, productId }: { variants: PdpVariant[]; productId: string }) {
  const locale = useLocale();
  const colors = useMemo(
    () =>
      [
        ...new Map(
          variants.map((v) => [v.color_code, locale === "ar" && v.color_ar ? v.color_ar : v.color_en]),
        ).entries(),
      ],
    [variants, locale],
  );
  const [color, setColor] = useState(colors.length === 1 ? colors[0]![0] : "");
  const sizes = useMemo(
    () => variants.filter((v) => !color || v.color_code === color),
    [variants, color],
  );
  const [variantId, setVariantId] = useState(sizes.length === 1 ? sizes[0]!.id : "");
  const chosen = variants.find((v) => v.id === variantId);
  const [added, setAdded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyState, setNotifyState] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function init() {
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
    }
    void init();
  }, [productId]);

  async function toggleWishlist() {
    if (!customerId) return;
    const supabase = supabaseBrowser();
    if (saved) {
      setSaved(false);
      await supabase.from("wishlists").delete().eq("customer_id", customerId).eq("product_id", productId);
    } else {
      setSaved(true);
      await supabase.from("wishlists").insert({ customer_id: customerId, product_id: productId });
    }
  }

  async function subscribeAlert() {
    if (!chosen) return;
    const { error } = await supabaseBrowser().rpc("subscribe_stock_alert", {
      p_variant_id: chosen.id,
      p_phone: signedIn ? null : notifyPhone,
    });
    setNotifyState(error ? "error" : "done");
  }

  return (
    <div className="mt-8 space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="text-sm font-medium">{t(locale, "sf.pdp.color")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setColor(code);
                  setVariantId("");
                  setAdded(false);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  color === code ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium">{t(locale, "sf.pdp.size")}</p>
        {colors.length > 1 && !color ? (
          <p className="mt-2 text-sm text-muted-foreground">{t(locale, "sf.pdp.selectColor")}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {(colors.length > 1 && !color ? [] : sizes).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVariantId(v.id);
                setAdded(false);
                setNotifyState("idle");
              }}
              className={`min-w-12 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                variantId === v.id
                  ? "border-foreground bg-foreground text-background"
                  : v.available <= 0
                    ? "border-dashed text-muted-foreground line-through hover:border-foreground"
                    : "hover:border-foreground"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
        {chosen && chosen.available > 0 && chosen.available <= 3 && (
          <p className="mt-2 text-xs text-muted-foreground">{t(locale, "sf.pdp.onlyLeft", { n: chosen.available })}</p>
        )}
      </div>

      {chosen && chosen.available <= 0 ? (
        <div className="space-y-3 rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">{t(locale, "sf.pdp.soldOut")}</p>
          {notifyState === "done" ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t(locale, "sf.pdp.notifyDone")}
            </p>
          ) : (
            <>
              {!signedIn && (
                <Input
                  value={notifyPhone}
                  onChange={(e) => setNotifyPhone(e.target.value)}
                  placeholder="+961 71 000 000"
                  inputMode="tel"
                  dir="ltr"
                />
              )}
              <Button
                variant="outline"
                className="w-full"
                disabled={!signedIn && notifyPhone.replace(/[^0-9+]/g, "").length < 7}
                onClick={() => void subscribeAlert()}
              >
                {t(locale, "sf.pdp.notifyCta")}
              </Button>
              {notifyState === "error" && (
                <p className="text-sm text-destructive">{t(locale, "sf.pdp.notifyError")}</p>
              )}
            </>
          )}
        </div>
      ) : (
        <Button
          className="h-12 w-full text-base"
          disabled={!chosen || chosen.available <= 0}
          onClick={() => {
            if (!chosen) return;
            addToCart(chosen.id);
            setAdded(true);
          }}
        >
          {added ? t(locale, "sf.pdp.added") : chosen ? t(locale, "sf.pdp.addToBag") : t(locale, "sf.pdp.selectSize")}
        </Button>
      )}

      {signedIn ? (
        <button
          type="button"
          onClick={() => void toggleWishlist()}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {saved ? t(locale, "sf.pdp.wishSaved") : t(locale, "sf.pdp.wishSave")}
        </button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <Link href={lhref(locale, "/account/login")} className="underline underline-offset-4">{t(locale, "sf.pdp.signIn")}</Link> {t(locale, "sf.pdp.signInWish")}
        </p>
      )}
    </div>
  );
}
