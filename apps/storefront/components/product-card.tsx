import Link from "next/link";

export interface CardProduct {
  slug: string;
  name_en: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  front?: string | null;
  back?: string | null;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Listing card. Front photo shown, back photo swaps in on hover (§4).
 * Until media lands, an elegant typographic placeholder holds the frame.
 */
export function ProductCard({ product }: { product: CardProduct }) {
  const onSale = product.sale_price_usd_cents != null;
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {product.front ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.front}
              alt={product.name_en}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
            />
            {product.back ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.back}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {product.name_en}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium">{product.name_en}</h3>
        <p className="text-sm text-muted-foreground">
          {onSale ? (
            <>
              <span className="text-foreground">{usd(product.sale_price_usd_cents!)}</span>{" "}
              <span className="line-through">{usd(product.price_usd_cents)}</span>
            </>
          ) : (
            usd(product.price_usd_cents)
          )}
        </p>
      </div>
    </Link>
  );
}
