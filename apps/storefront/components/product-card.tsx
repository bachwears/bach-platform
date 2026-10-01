import Link from "next/link";
import type { Locale } from "@bach/i18n";

import { colorFill } from "../lib/colors";
import { QuickShop, type QuickShopSize } from "./quick-shop";

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
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Listing card: 3:4 photo on the pale well (BACH's photography is shot 3:4),
 * back photo on hover for mouse users, then name, price and square swatches
 * in small uppercase. The + opens sizes for quick add on any device.
 */
export function ProductCard({
  product,
  locale = "en",
  revealDelay,
}: {
  product: CardProduct;
  locale?: Locale;
  revealDelay?: number;
}) {
  const onSale = product.sale_price_usd_cents != null && product.sale_price_usd_cents < product.price_usd_cents;
  // Product names stay English in every locale (founder decision 2026-09-07).
  const name = product.name_en;
  const href = `${locale === "ar" ? "/ar" : ""}/products/${product.slug}`;
  const off = onSale ? Math.round((1 - product.sale_price_usd_cents! / product.price_usd_cents) * 100) : 0;

  return (
    <div
      className="group"
      {...(revealDelay != null
        ? { "data-reveal": "", style: { ["--anim-delay" as string]: `${revealDelay}ms` } }
        : {})}
    >
      {/* The photo repeats the name link below, so it stays out of the tab order and the accessibility tree. */}
      <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[3/4] overflow-hidden bg-secondary">
        {product.front ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.front}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0 motion-reduce:transition-none"
            />
            {product.back ? (
              // hidden on touch screens: a lazy display:none image is never fetched
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.back}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:block"
              />
            ) : null}
          </>
        ) : (
          <span className="type-meta absolute inset-0 grid place-items-center p-6 text-center text-muted-foreground">
            {name}
          </span>
        )}
      </Link>

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
        <ColorChips colors={product.colors} />
        {product.sizes?.length ? <QuickShop sizes={product.sizes} name={name} /> : null}
      </div>
    </div>
  );
}

function ColorChips({ colors }: { colors?: string[] }) {
  const swatches = [...new Set(colors ?? [])]
    .map((c) => ({ name: c, hex: colorFill(c) }))
    .filter((c): c is { name: string; hex: string } => c.hex != null);
  if (swatches.length < 2) return null;
  return (
    <span className="mt-2 flex items-center gap-1" aria-label={swatches.map((s) => s.name).join(", ")}>
      {swatches.slice(0, 6).map((s) => (
        <span
          key={s.name}
          title={s.name}
          className="h-2.5 w-2.5 border border-black/15 dark:border-white/25"
          style={{ background: s.hex }}
        />
      ))}
      {swatches.length > 6 && <span className="type-meta ms-1 text-muted-foreground">+{swatches.length - 6}</span>}
    </span>
  );
}
