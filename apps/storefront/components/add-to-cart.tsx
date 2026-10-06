"use client";

import { Bookmark, X } from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { addToCart } from "../lib/cart";
import { arrivedVia, track } from "../lib/track";
import { usePdpColour } from "./pdp-colour";
import { WISHLIST_EVENT } from "./pdp-topbar";
import { lhref, useLocale } from "../lib/locale-client";
import { availableFirst } from "../lib/sizes";
import { DeliveryProgress, useBagGoods } from "./delivery-progress";
import { FIT_OPEN_EVENT } from "./fit-finder";
import { colorFill } from "../lib/colors";

/** "Regular fit" → "This product has a regular fit." */
function fitSentence(fit: string) {
  const f = fit.trim().replace(/\s*fit$/i, "").toLowerCase();
  return `This product has ${/^[aeiou]/.test(f) ? "an" : "a"} ${f} fit.`;
}

/** The bag's way to free delivery, right after an add (reads the whole bag). */
function BagProgress() {
  const goods = useBagGoods();
  return goods == null ? null : <DeliveryProgress goods={goods} />;
}

export interface PdpVariant {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  color_ar?: string | null;
  available: number;
  /** a size this colour isn't made in — listed crossed out, never addable */
  missing?: boolean;
}

// Category codes whose sizing follows the customer's saved bottoms size; anything
// under Accessories (scarves, hats…) is one-size, so nothing is preselected for it.
// Matched against the product's category and every category above it.
const BOTTOMS = new Set(["BTMS", "PNT", "JOG"]);
const ONE_SIZE = new Set(["ACC", "SCF", "HAT"]);
type SizeSlot = "size_top" | "size_bottom" | "size_shoe";

function sizeSlot(categoryCodes: string[], variants: PdpVariant[]): SizeSlot | null {
  if (categoryCodes.some((c) => ONE_SIZE.has(c))) return null;
  if (variants.length && variants.every((v) => /^\d+$/.test(v.size))) return "size_shoe";
  return categoryCodes.some((c) => BOTTOMS.has(c)) ? "size_bottom" : "size_top";
}


/**
 * Zara-style buy box: colour chips, then ADD opens a size sheet (bottom sheet on
 * phones, inline panel on desktop). Picking an in-stock size adds it at once; a
 * sold-out size offers the back-in-stock alert. On phones a slim bar with name,
 * price and ADD stays pinned while the main button is scrolled away.
 */
export function AddToCart({
  variants,
  productId,
  categoryCodes = [],
  name,
  priceLabel,
  sizeGuide,
  fit,
  heading,
  shownColor = null,
  photoColors = [],
  initialColorCode = null,
  sizeRun,
}: {
  /** every size the piece is listed in (the usual run included) */
  sizeRun?: string[];
  variants: PdpVariant[];
  /** colour the main product photos show (color_en), if known */
  shownColor?: string | null;
  /** colours (color_en) that have photos of their own */
  photoColors?: string[];
  /** colour to open on, from a shared ?color= link */
  initialColorCode?: string | null;
  productId: string;
  /** the product's category code, then each category above it */
  categoryCodes?: string[];
  name: string;
  priceLabel: string;
  sizeGuide?: React.ReactNode;
  /** the product's fit (Regular fit, Oversized…), said at the top of the size list */
  fit?: string | null;
  /** name + price, laid out with the colour squares beside them on phones */
  heading?: React.ReactNode;
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
  const { setColor: setGalleryColor } = usePdpColour();
  // Open on a linked colour, else the photographed colour when it can be bought, else any colour in stock.
  const [color, setColor] = useState(
    () =>
      (
        variants.find((v) => initialColorCode && v.color_code === initialColorCode) ??
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
  // the gallery follows the picked colour (an in-stock fallback can differ from the hero photos)
  useEffect(() => {
    setGalleryColor(pickedEn);
  }, [pickedEn, setGalleryColor]);
  // The usual run is always listed: buyable sizes first, then sold-out and
  // not-made sizes crossed out.
  const sizes = useMemo(() => {
    const own = variants.filter((v) => v.color_code === color);
    const extra = (sizeRun ?? [])
      .filter((s) => !own.some((v) => v.size === s))
      .map((s): PdpVariant => ({
        id: `missing-${s}`,
        size: s,
        color_code: color,
        color_en: own[0]?.color_en ?? "",
        available: 0,
        missing: true,
      }));
    return availableFirst([...own, ...extra], (v) => v.available <= 0);
  }, [variants, color, sizeRun]);
  const [sheet, setSheet] = useState(false);
  const [added, setAdded] = useState<PdpVariant | null>(null);
  const [alertFor, setAlertFor] = useState<PdpVariant | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wishError, setWishError] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyState, setNotifyState] = useState<"idle" | "done" | "error">("idle");
  const [savedSize, setSavedSize] = useState<string | null>(null);
  // the size picked on the page (sizes are listed inline for a quick pick)
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  // "Use this size" in the Fit Finder picks the size here
  useEffect(() => {
    const onPick = (e: Event) => {
      const size = (e as CustomEvent<{ size?: string }>).detail?.size;
      if (size) {
        setPickedSize(size);
        setAdded(null);
        setAlertFor(null);
        setSheet(true);
      }
    };
    window.addEventListener("bach-fit-pick", onPick);
    return () => window.removeEventListener("bach-fit-pick", onPick);
  }, []);
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
      const slot = sizeSlot(categoryCodes, variants);
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
    // variants and categoryCodes are fixed per product page
  }, [productId]);

  // The phone product bar saves too: keep one state.
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ productId: string; saved: boolean }>).detail;
      if (d?.productId === productId) setSaved(d.saved);
    };
    window.addEventListener(WISHLIST_EVENT, onChange);
    return () => window.removeEventListener(WISHLIST_EVENT, onChange);
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

  // credited to the recommendation row that led here, when there was one
  function trackAdd() {
    const via = arrivedVia(productId);
    track("add_to_bag", { product: productId, source: "pdp", meta: via ? { via } : undefined });
  }

  function openSheet() {
    setAdded(null);
    setAlertFor(null);
    setNotifyState("idle");
    // A single size needs no choice; every other piece shows its sizes first (Zara-style).
    const ready = sizes.length === 1 && sizes[0]!.available > 0 ? sizes[0]! : null;
    if (ready) {
      addToCart(ready.id);
      trackAdd();
      setAdded(ready);
    }
    setSheet(true);
  }

  async function toggleWishlist() {
    if (!signedIn || !customerId) {
      router.push(lhref(locale, "/account/login"));
      return;
    }
    const supabase = supabaseBrowser();
    const next = !saved;
    const announce = (v: boolean) =>
      window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: { productId, saved: v } }));
    setWishError(false);
    setSaved(next);
    announce(next);
    const { error } = next
      ? await supabase.from("wishlists").insert({ customer_id: customerId, product_id: productId })
      : await supabase.from("wishlists").delete().eq("customer_id", customerId).eq("product_id", productId);
    // 23505: already saved (e.g. from another tab) — the state is right as it is
    if (error && error.code !== "23505") {
      setSaved(!next);
      announce(!next);
      setWishError(true);
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
  // The pick follows colour changes by size name; the shopper's saved size is the default.
  const picked =
    sizes.find((v) => v.size === pickedSize && v.available > 0) ??
    (pickedSize == null && mine && mine.available > 0 ? mine : undefined);
  const soldOutEverywhere = variants.every((v) => v.available <= 0);
  const addLabel = soldOutEverywhere ? t(locale, "sf.pdp.soldOutAll") : t(locale, "sf.pdp.add");

  // picking a colour: swap the photos (and bring them into view on phones), keep the link shareable
  function chooseColor(code: string) {
    const nextEn = variants.find((v) => v.color_code === code)?.color_en ?? null;
    const swaps = code !== color && !!nextEn && photoColors.includes(nextEn);
    setColor(code);
    closeSheet();
    // On phones the photos sit far above the chips: bring the new colour's photos into view.
    if (swaps && window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("pdp-gallery")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
    // shareable without a reload or a history entry per tap
    const url = new URL(window.location.href);
    url.searchParams.set("color", code);
    window.history.replaceState(window.history.state, "", url);
  }

  // Colours as small squares (Zara-style); a colour without a known swatch shows its name.
  const swatches = (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t(locale, "sf.pdp.color")}>
      {colors.map(([code, label]) => {
        const en = variants.find((v) => v.color_code === code)?.color_en ?? "";
        const fill = colorFill(en);
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={color === code}
            aria-label={label}
            title={label}
            onClick={() => chooseColor(code)}
            className={`grid place-items-center border p-[3px] transition-colors ${
              color === code ? "border-foreground" : "border-transparent hover:border-border"
            } ${fill ? "h-8 w-8" : "type-meta h-8 px-2"}`}
          >
            {fill ? <span className="block h-full w-full border border-black/10" style={{ background: fill }} /> : label}
          </button>
        );
      })}
    </div>
  );
  const shownNote =
    shownLabel && pickedEn && !photoColors.includes(pickedEn) ? (
      <p className="type-meta mt-3 text-muted-foreground">{t(locale, "sf.pdp.shownIn", { c: shownLabel })}</p>
    ) : null;

  return (
    <div className="mt-6 space-y-5 lg:mt-8 lg:space-y-6">
      {/* phones: name and price on the left, colour squares on the right (Zara-style) */}
      {heading ? (
        <div className="-mt-6 flex items-start justify-between gap-4 lg:mt-0 lg:block">
          <div className="min-w-0">{heading}</div>
          {colors.length > 1 ? <div className="shrink-0 pt-0.5 lg:hidden">{swatches}</div> : null}
        </div>
      ) : null}
      {colors.length > 1 ? <div className="lg:hidden">{shownNote}</div> : null}
      {colors.length > 1 && (
        <div className="hidden lg:block">
          <p className="type-meta text-muted-foreground">
            {t(locale, "sf.pdp.color")} — <span className="text-foreground">{colors.find(([c]) => c === color)?.[1]}</span>
          </p>
          <div className="mt-3">{swatches}</div>
          {shownNote}
        </div>
      )}
      {/* One size only: ADD adds it straight away, so say which size it is first. */}
      {sizes.length === 1 && (
        <p className="type-meta text-muted-foreground">
          {t(locale, "sf.pdp.size")} — <span className="text-foreground">{sizes[0]!.size}</span>
        </p>
      )}
      {pickedSize == null && savedSize && sizes.length > 0 && (!mine || mine.available <= 0) && (
        <p className="type-meta text-muted-foreground">{t(locale, "sf.pdp.yourSizeOut", { s: savedSize })}</p>
      )}
      {/* a size picked from the Fit Finder that this colour can't sell */}
      {pickedSize != null && !picked && sizes.length > 0 && (
        <p className="type-meta text-muted-foreground" role="status">
          {t(locale, "sf.pdp.pickedOut", { s: pickedSize })}
        </p>
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
          // phones save from the product bar at the top
          className="hidden h-12 w-12 place-items-center border border-border hover:border-foreground md:grid"
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} strokeWidth={1.25} aria-hidden />
        </button>
      </div>
      {wishError && (
        <p role="alert" className="type-meta hidden text-destructive md:block">
          {t(locale, "sf.pdp.wishError")}
        </p>
      )}

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
                  {name} ·{" "}
                  {colors.length > 1 ? `${locale === "ar" && added.color_ar ? added.color_ar : added.color_en} / ` : ""}
                  {added.size}
                </p>
                <BagProgress />
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
                {fit ? <p className="mt-1 text-sm">{fitSentence(fit)}</p> : null}
                <ul className="mt-1 divide-y">
                  {sizes.map((v) => {
                    const out = v.available <= 0;
                    const isMine = pickedSize != null ? v.size === pickedSize : mine?.id === v.id;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          disabled={v.missing}
                          onClick={() => {
                            if (out) {
                              setAlertFor(v);
                              return;
                            }
                            addToCart(v.id);
                            trackAdd();
                            setAdded(v);
                          }}
                          className={`flex h-12 w-full items-center justify-between gap-4 text-start ${out ? "text-muted-foreground" : "hover:opacity-60"}`}
                        >
                          <span className={`type-label ${out ? "line-through" : ""} ${isMine ? "font-medium" : ""}`}>{v.size}</span>
                          <span className="type-meta text-muted-foreground">
                            {v.missing
                              ? t(locale, "sf.shop.outOfStock")
                              : out
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
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {sizeGuide}
                  {sizes.length > 1 ? (
                    <button
                      type="button"
                      className="type-meta underline underline-offset-4 hover:opacity-60"
                      onClick={() => {
                        closeSheet();
                        window.dispatchEvent(new Event(FIT_OPEN_EVENT));
                      }}
                    >
                      {t(locale, "sf.fit.open")}
                    </button>
                  ) : null}
                </div>
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
            <p className="type-meta tabular-nums text-muted-foreground">
              {priceLabel}
              {colors.length > 1 ? ` · ${colors.find(([c]) => c === color)?.[1] ?? ""}` : ""}
            </p>
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
