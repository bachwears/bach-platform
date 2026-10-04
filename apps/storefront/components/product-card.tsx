"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t, type Locale } from "@bach/i18n";

import { colorFill } from "../lib/colors";
import { photoSrc } from "../lib/media";
import { availableFirst } from "../lib/sizes";
import { QuickShop, type QuickShopSize } from "./quick-shop";

// two across on phones, four on desktop
const CARD_SIZES = "(min-width: 1024px) 25vw, 50vw";

export interface CardProduct {
  slug: string;
  name_en: string;
  name_ar?: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  front?: string | null;
  back?: string | null;
  colors?: string[];
  sizes?: QuickShopSize[];
  /** photos to swipe, by colour: "" = the photographed (hero) colour, then each colour with its own photos */
  photos?: Record<string, string[]>;
  heroColor?: string | null;
  /** every active variant, for colour-aware quick add */
  variants?: Array<{ variantId: string; size: string; color: string; colorCode: string | null; soldOut?: boolean }>;
  /** every size the piece is listed in (usual run included); missing ones show crossed out */
  sizeRun?: string[];
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Listing card: 3:4 photos on the pale well, swiped sideways (arrows on hover for
 * mouse users, back photo on hover of the first). Name, price and square swatches
 * in small uppercase; a swatch switches the photos and the quick-add sizes to that
 * colour, and the + adds the picked colour in the tapped size.
 */
export function ProductCard({
  product,
  locale = "en",
  revealDelay,
  variant = "full",
}: {
  product: CardProduct;
  locale?: Locale;
  revealDelay?: number;
  /** "mini": photo, price and + only (recommendation rows) */
  variant?: "full" | "mini";
}) {
  const onSale = product.sale_price_usd_cents != null && product.sale_price_usd_cents < product.price_usd_cents;
  // Product names stay English in every locale (founder decision 2026-09-07).
  const name = product.name_en;
  const off = onSale ? Math.round((1 - product.sale_price_usd_cents! / product.price_usd_cents) * 100) : 0;

  const variants = product.variants ?? [];
  const colours = [...new Set(variants.map((v) => v.color))];
  // Start on the colour the photos show, so a quick add matches what the shopper sees.
  const [colour, setColour] = useState<string | null>(
    colours.find((c) => c === product.heroColor) ?? colours[0] ?? null,
  );

  const photos = product.photos
    ? (colour && colour !== product.heroColor && product.photos[colour]?.length ? product.photos[colour] : product.photos[""]) ?? []
    : [product.front].filter((p): p is string => !!p);
  const hover = colour && colour !== product.heroColor && product.photos?.[colour]?.length ? photos[1] ?? null : product.back ?? null;

  const colourCode = variants.find((v) => v.color === colour)?.colorCode;
  const href = `${locale === "ar" ? "/ar" : ""}/products/${product.slug}${
    colourCode && colour !== product.heroColor ? `?color=${encodeURIComponent(colourCode)}` : ""
  }`;

  // Every usual size is listed; ones this colour doesn't come in (or has sold out of)
  // are crossed out after the buyable ones.
  const sizes: QuickShopSize[] =
    colour && variants.length
      ? availableFirst(
          (product.sizeRun ?? [...new Set(variants.map((v) => v.size))]).map((size) => {
            const v = variants.find((x) => x.color === colour && x.size === size);
            return v
              ? { variantId: v.variantId, size, soldOut: v.soldOut }
              : { variantId: `missing-${size}`, size, soldOut: true };
          }),
          (s) => !!s.soldOut,
        )
      : product.sizes ?? [];
  const showColour = colours.length > 1 ? colour : null;

  return (
    <div
      className="group"
      {...(revealDelay != null
        ? { "data-reveal": "", style: { ["--anim-delay" as string]: `${revealDelay}ms` } }
        : {})}
    >
      <CardPhotos key={colour ?? ""} photos={photos} hover={hover} href={href} name={name} mini={variant === "mini"} locale={locale} />

      {variant === "mini" ? (
        <div className="relative mt-2 pb-12 text-center">
          <p className="type-meta tabular-nums">
            {usd(onSale ? product.sale_price_usd_cents! : product.price_usd_cents)}
          </p>
          {sizes.length ? <QuickShop sizes={sizes} name={name} color={showColour} align="center" /> : null}
        </div>
      ) : (
        <div className="relative mt-3 pe-10">
          <Link href={href} className="block">
            <h3 className="type-meta line-clamp-2">{name}</h3>
          </Link>
          <p className="type-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
            {onSale ? (
              <>
                <span>{usd(product.sale_price_usd_cents!)}</span>
                <span className="text-muted-foreground line-through">{usd(product.price_usd_cents)}</span>
                <span className="bg-foreground px-1 text-background">-{off}%</span>
              </>
            ) : (
              usd(product.price_usd_cents)
            )}
          </p>
          <ColorChips colors={product.colors} selected={colour} onPick={variants.length ? setColour : undefined} />
          {sizes.length ? <QuickShop sizes={sizes} name={name} color={showColour} /> : null}
        </div>
      )}
    </div>
  );
}

/** The card's photo strip: native sideways scroll with snap, a thin position bar, hover arrows. */
function CardPhotos({
  photos: all,
  hover,
  href,
  name,
  mini,
  locale,
}: {
  photos: string[];
  hover: string | null;
  href: string;
  name: string;
  mini: boolean;
  locale: Locale;
}) {
  const strip = useRef<HTMLAnchorElement>(null);
  const [at, setAt] = useState(0);
  // With a mouse the hover photo already shows on the first slide, so it isn't
  // repeated in the swipe; touch screens have no hover and keep every photo.
  const [mouse, setMouse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setMouse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const photos = mouse && hover ? all.filter((src, i) => i === 0 || src !== hover) : all;
  const many = photos.length > 1;

  const go = (step: number) => {
    const el = strip.current;
    if (!el) return;
    // scrollLeft runs negative in RTL; scrollBy follows the reading direction
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: step * dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="group/photo relative aspect-[3/4] overflow-hidden bg-secondary">
      {/* The photos repeat the name link below, so they stay out of the tab order and the accessibility tree. */}
      <Link
        ref={strip}
        href={href}
        draggable={false}
        {...(mini ? { "aria-label": name } : { tabIndex: -1, "aria-hidden": true })}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth)));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.length ? (
          photos.map((src, i) => (
            <span key={src} className="relative h-full w-full shrink-0 snap-start snap-always">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...photoSrc(src, CARD_SIZES)}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover ${
                  i === 0 && hover
                    ? "transition-opacity duration-300 group-hover/photo:opacity-0 motion-reduce:transition-none"
                    : ""
                }`}
              />
              {i === 0 && hover ? (
                // mouse only: a lazy display:none image is never fetched on touch screens
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  {...photoSrc(hover, CARD_SIZES)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:block"
                />
              ) : null}
            </span>
          ))
        ) : (
          <span className="type-meta grid h-full w-full place-items-center p-6 text-center text-muted-foreground">
            {name}
          </span>
        )}
      </Link>

      {many ? (
        <>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex gap-1" aria-hidden>
            {photos.map((src, i) => (
              <span key={src} className={`h-px flex-1 ${i === at ? "bg-foreground" : "bg-foreground/20"}`} />
            ))}
          </div>
          {/* arrows: mouse users only, on hover; swiping covers touch */}
          {(
            [
              [-1, "start-0", ChevronLeft, "sf.home.prev"],
              [1, "end-0", ChevronRight, "sf.home.next"],
            ] as const
          ).map(([step, side, Icon, label]) =>
            (step < 0 ? at > 0 : at < photos.length - 1) ? (
              <button
                key={step}
                type="button"
                tabIndex={-1}
                aria-label={t(locale, label)}
                onClick={() => go(step)}
                className={`absolute top-1/2 ${side} hidden h-10 w-10 -translate-y-1/2 place-items-center opacity-0 transition-opacity group-hover/photo:opacity-100 [@media(hover:hover)]:grid`}
              >
                <Icon className="h-5 w-5 rtl:rotate-180" strokeWidth={1} aria-hidden />
              </button>
            ) : null,
          )}
        </>
      ) : null}
    </div>
  );
}

function ColorChips({
  colors,
  selected,
  onPick,
}: {
  colors?: string[];
  selected: string | null;
  onPick?: (c: string) => void;
}) {
  const swatches = [...new Set(colors ?? [])]
    .map((c) => ({ name: c, hex: colorFill(c) }))
    .filter((c): c is { name: string; hex: string } => c.hex != null);
  if (swatches.length < 2) return null;
  const chip = (s: { hex: string }, on: boolean) => (
    <span
      className={`block h-2.5 w-2.5 border ${on ? "border-foreground outline outline-1 outline-offset-2 outline-foreground" : "border-black/15 dark:border-white/25"}`}
      style={{ background: s.hex }}
    />
  );
  return (
    <span className="-ms-1.5 mt-1 flex flex-wrap items-center" role={onPick ? "group" : undefined} aria-label={swatches.map((s) => s.name).join(", ")}>
      {swatches.slice(0, 6).map((s) =>
        onPick ? (
          // 28px tap target around a 10px square
          <button
            key={s.name}
            type="button"
            title={s.name}
            aria-label={s.name}
            aria-pressed={s.name === selected}
            onClick={() => onPick(s.name)}
            className="grid h-7 w-7 place-items-center"
          >
            {chip(s, s.name === selected)}
          </button>
        ) : (
          <span key={s.name} title={s.name} className="grid h-7 w-7 place-items-center">
            {chip(s, false)}
          </span>
        ),
      )}
      {swatches.length > 6 && <span className="type-meta ms-1 text-muted-foreground">+{swatches.length - 6}</span>}
    </span>
  );
}
