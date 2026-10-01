"use client";

import { Bookmark, X } from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
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

// Category codes whose sizing follows the customer's saved bottoms size; scarves
// and hats are one-size accessories, so nothing is preselected for them.
const BOTTOMS = new Set(["BTMS", "PNT", "JOG"]);
const ONE_SIZE = new Set(["SCF", "HAT"]);
type SizeSlot = "size_top" | "size_bottom" | "size_shoe";

function sizeSlot(categoryCode: string | null, variants: PdpVariant[]): SizeSlot | null {
  if (categoryCode && ONE_SIZE.has(categoryCode)) return null;
  if (variants.length && variants.every((v) => /^\d+$/.test(v.size))) return "size_shoe";
  return categoryCode && BOTTOMS.has(categoryCode) ? "size_bottom" : "size_top";
}

const ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const rank = (s: string) => {
  const i = ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isFinite(n) ? 100 + n : 999;
};

/**
 * Zara-style buy box: colour chips, then ADD opens a size sheet (bottom sheet on
 * phones, inline panel on desktop). Picking an in-stock size adds it at once; a
 * sold-out size offers the back-in-stock alert. On phones a slim bar with name,
 * price and ADD stays pinned while the main button is scrolled away.
 */
export function AddToCart({
  variants,
  productId,
  categoryCode = null,
  name,
  priceLabel,
  sizeGuide,
  shownColor = null,
}: {
  variants: PdpVariant[];
  /** colour the product photos show (color_en), if known */
  shownColor?: string | null;
  productId: string;
  categoryCode?: string | null;
  name: string;
  priceLabel: string;
  sizeGuide?: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const colors = useMemo(
    () => [
      ...new Map(
        variants.map((v) => [v.color_code, locale === "ar" && v.color_ar ? v.color_ar : v.color_en]),
      ).entries(),
    ],
    [variants, locale],
  );
  // Open on the photographed colour when it can be bought, else any colour in stock.
  const [color, setColor] = useState(
    () =>
      (
        variants.find((v) => shownColor && v.color_en === shownColor && v.available > 0) ??
        variants.find((v) => v.available > 0) ??
        variants[0]
      )?.color_code ?? "",
  );
  const shownLabel = shownColor
    ? (() => {
        const v = variants.find((x) => x.color_en === shownColor);
        return v ? (locale === "ar" && v.color_ar ? v.color_ar : v.color_en) : null;
      })()
    : null;
  const pickedEn = variants.find((v) => v.color_code === color)?.color_en ?? null;
  const sizes = useMemo(
    () => variants.filter((v) => v.color_code === color).sort((a, b) => rank(a.size) - rank(b.size)),
    [variants, color],
  );
  const [sheet, setSheet] = useState(false);
  const [added, setAdded] = useState<PdpVariant | null>(null);
  const [alertFor, setAlertFor] = useState<PdpVariant | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyState, setNotifyState] = useState<"idle" | "done" | "error">("idle");
  const [savedSize, setSavedSize] = useState<string | null>(null);
  const [mainVisible, setMainVisible] = useState(true);
  const mainRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function init() {
      const { data: sess } = await supabase.auth.getSession();
      setSignedIn(!!sess.session);
      if (!sess.session) return;
      const { data: cid } = await supabase.rpc("my_customer_id");
      if (!cid) return;
      setCustomerId(cid as string);
      const slot = sizeSlot(categoryCode, variants);
      if (slot) {
        void supabase
          .from("customers")
          .select(slot)
          .eq("id", cid)
          .maybeSingle()
          .then(({ data }) => setSavedSize((data as Record<string, string | null> | null)?.[slot] ?? null));
      }
      const { data: w } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("customer_id", cid)
        .eq("product_id", productId)
        .maybeSingle();
      setSaved(!!w);
    }
    void init();
    // variants and categoryCode are fixed per product page
  }, [productId]);

  // Pinned phone bar shows only while the main ADD is off screen.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMainVisible(e!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector<HTMLElement>("button")?.focus();
    // On phones the sheet covers the page, so the page behind shouldn't scroll.
    const phone = window.matchMedia("(max-width: 1023px)").matches;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (phone) document.body.style.overflow = "";
    };
  }, [sheet]);

  function closeSheet() {
    setSheet(false);
    setAdded(null);
    setAlertFor(null);
    setNotifyState("idle");
  }

  function openSheet() {
    setAdded(null);
    setAlertFor(null);
    setNotifyState("idle");
    // A single size needs no choice.
    if (sizes.length === 1 && sizes[0]!.available > 0) {
      addToCart(sizes[0]!.id);
      setAdded(sizes[0]!);
    }
    setSheet(true);
  }

  async function toggleWishlist() {
    if (!signedIn || !customerId) {
      router.push(lhref(locale, "/account/login"));
      return;
    }
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
    if (!alertFor) return;
    const { error } = await supabaseBrowser().rpc("subscribe_stock_alert", {
      p_variant_id: alertFor.id,
      p_phone: signedIn ? null : notifyPhone,
    });
    setNotifyState(error ? "error" : "done");
  }

  const mine = savedSize ? sizes.find((v) => v.size.toUpperCase() === savedSize.toUpperCase()) : undefined;
  const soldOutEverywhere = variants.every((v) => v.available <= 0);
  const addLabel = soldOutEverywhere ? t(locale, "sf.pdp.soldOutAll") : t(locale, "sf.pdp.add");

  return (
    <div className="mt-8 space-y-6">
      {colors.length > 1 && (
        <div>
          <p className="type-meta text-muted-foreground">
            {t(locale, "sf.pdp.color")} — <span className="text-foreground">{colors.find(([c]) => c === color)?.[1]}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map(([code, label]) => (
              <button
                key={code}
                type="button"
                aria-pressed={color === code}
                onClick={() => {
                  setColor(code);
                  closeSheet();
                }}
                className={`type-meta h-10 border px-3 transition-colors ${
                  color === code ? "border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {shownLabel && pickedEn !== shownColor ? (
            <p className="type-meta mt-3 text-muted-foreground">{t(locale, "sf.pdp.shownIn", { c: shownLabel })}</p>
          ) : null}
        </div>
      )}
      {/* One size only: ADD adds it straight away, so say which size it is first. */}
      {sizes.length === 1 && (
        <p className="type-meta text-muted-foreground">
          {t(locale, "sf.pdp.size")} — <span className="text-foreground">{sizes[0]!.size}</span>
        </p>
      )}
      {savedSize && sizes.length > 0 && (!mine || mine.available <= 0) && (
        <p className="type-meta text-muted-foreground">{t(locale, "sf.pdp.yourSizeOut", { s: savedSize })}</p>
      )}

      <div className="flex gap-2">
        <button
          ref={mainRef}
          type="button"
          disabled={!sizes.length}
          onClick={openSheet}
          aria-expanded={sheet}
          className="type-label h-12 flex-1 border border-foreground bg-background transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
        >
          {addLabel}
        </button>
        <button
          type="button"
          onClick={() => void toggleWishlist()}
          aria-pressed={saved}
          aria-label={saved ? t(locale, "sf.pdp.wishSaved") : t(locale, "sf.pdp.wishSave")}
          className="grid h-12 w-12 place-items-center border border-border hover:border-foreground"
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} strokeWidth={1.25} aria-hidden />
        </button>
      </div>

      {sheet && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-label={t(locale, "sf.pdp.selectSize")}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto border-t bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4 lg:static lg:z-auto lg:max-h-none lg:border lg:px-5 lg:pb-5"
          >
            <div className="flex items-center justify-between">
              <p className="type-heading">{added ? t(locale, "sf.pdp.addedTo") : t(locale, "sf.pdp.selectSize")}</p>
              <button type="button" aria-label={t(locale, "sf.nav.close")} className="-me-2 grid h-11 w-11 place-items-center" onClick={closeSheet}>
                <X className="h-5 w-5" strokeWidth={1} aria-hidden />
              </button>
            </div>

            {added ? (
              <div className="mt-2 space-y-4" role="status">
                <p className="type-label">
                  {name} · {added.size}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Link href={lhref(locale, "/cart")} className="type-label grid h-12 place-items-center bg-foreground text-background">
                    {t(locale, "sf.pdp.viewBag")}
                  </Link>
                  <button type="button" onClick={closeSheet} className="type-label h-12 border border-foreground">
                    {t(locale, "sf.pdp.continueShopping")}
                  </button>
                </div>
              </div>
            ) : alertFor ? (
              <div className="mt-2 space-y-4">
                <p className="type-label">
                  {alertFor.size} — {t(locale, "sf.pdp.soldOut")}
                </p>
                {notifyState === "done" ? (
                  <p className="text-sm">{t(locale, "sf.pdp.notifyDone")}</p>
                ) : (
                  <>
                    {!signedIn && (
                      <input
                        value={notifyPhone}
                        onChange={(e) => setNotifyPhone(e.target.value)}
                        placeholder="+961 71 000 000"
                        aria-label={t(locale, "sf.co.phone")}
                        inputMode="tel"
                        autoComplete="tel"
                        dir="ltr"
                        className="type-label h-11 w-full border-0 border-b border-foreground bg-transparent px-0 outline-none placeholder:text-muted-foreground"
                      />
                    )}
                    <button
                      type="button"
                      className="type-label h-12 w-full bg-foreground text-background disabled:opacity-40"
                      disabled={!signedIn && notifyPhone.replace(/[^0-9+]/g, "").length < 7}
                      onClick={() => void subscribeAlert()}
                    >
                      {t(locale, "sf.pdp.notifyCta")}
                    </button>
                    {notifyState === "error" && <p className="text-sm text-destructive">{t(locale, "sf.pdp.notifyError")}</p>}
                  </>
                )}
                <button type="button" className="type-meta underline underline-offset-4" onClick={() => setAlertFor(null)}>
                  {t(locale, "sf.pdp.otherSizes")}
                </button>
              </div>
            ) : (
              <>
                <ul className="mt-1 divide-y">
                  {sizes.map((v) => {
                    const out = v.available <= 0;
                    const isMine = mine?.id === v.id;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (out) {
                              setAlertFor(v);
                              return;
                            }
                            addToCart(v.id);
                            setAdded(v);
                          }}
                          className={`flex h-12 w-full items-center justify-between gap-4 text-start ${out ? "text-muted-foreground" : "hover:opacity-60"}`}
                        >
                          <span className={`type-label ${out ? "line-through" : ""} ${isMine ? "font-medium" : ""}`}>{v.size}</span>
                          <span className="type-meta text-muted-foreground">
                            {out
                              ? t(locale, "sf.pdp.notifyShort")
                              : isMine
                                ? t(locale, "sf.pdp.yourSizeTag")
                                : v.available <= 3
                                  ? t(locale, "sf.pdp.fewLeft")
                                  : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {sizeGuide ? <div className="mt-3">{sizeGuide}</div> : null}
              </>
            )}
          </div>
        </>
      )}

      {/* Phones: pinned buy bar while the main ADD is scrolled away. */}
      {!mainVisible && !sheet && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="type-meta truncate">{name}</p>
            <p className="type-meta tabular-nums text-muted-foreground">{priceLabel}</p>
          </div>
          <button
            type="button"
            onClick={openSheet}
            className="type-label h-11 shrink-0 bg-foreground px-8 text-background"
          >
            {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}
