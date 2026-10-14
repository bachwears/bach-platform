import Link from "next/link";

import { photoSrc } from "../lib/media";
import { lookPhoto, lookPrice, type Outfit } from "../lib/outfits";

const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/** A look in a grid or row: its main photo, "OUTFIT · n PIECES", name and price. */
export function OutfitCard({ outfit, priority = false }: { outfit: Outfit; priority?: boolean }) {
  const photo = lookPhoto(outfit);
  const price = lookPrice(outfit);
  const n = (outfit.outfit_items ?? []).length;
  return (
    <Link href={`/outfits/${outfit.slug}`} className="group block">
      <span className="block aspect-[3/4] overflow-hidden bg-secondary">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...photoSrc(photo, "(min-width: 1024px) 25vw, 50vw")}
            alt={outfit.name_en}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : null}
      </span>
      <span className="type-meta mt-3 block text-muted-foreground">OUTFIT · {n} PIECES</span>
      <span className="type-meta mt-1 block line-clamp-2">{outfit.name_en}</span>
      <span className="type-meta mt-1 block tabular-nums">
        {price.saving > 0 ? (
          <>
            <span className="block text-muted-foreground line-through">{usd(price.sum)}</span>
            <span className="mt-1 inline-flex gap-3 bg-foreground px-1.5 py-0.5 text-background">
              <span>-{Math.round((price.saving / price.sum) * 100)}%</span>
              <span>{usd(price.pay)}</span>
            </span>
          </>
        ) : (
          usd(price.pay)
        )}
      </span>
    </Link>
  );
}
