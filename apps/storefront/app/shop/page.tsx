import type { Metadata } from "next";
import { supabaseServer } from "@bach/supabase/server";

import { ProductCard, type CardProduct } from "../../components/product-card";
import { SiteHeader } from "../../components/site-header";

export const metadata: Metadata = {
  title: "Shop — BACH Wears",
  description: "The full BACH Wears collection. Considered menswear from Lebanon.",
};

export default async function ShopPage() {
  const supabase = await supabaseServer();
  const { data: products } = await supabase
    .from("products")
    .select("slug, name_en, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const items: CardProduct[] = (products ?? []).map((p) => {
    const media = (p.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? [];
    return {
      slug: p.slug,
      name_en: p.name_en,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      front: media.find((m) => m.kind === "front")?.storage_path ?? null,
      back: media.find((m) => m.kind === "back")?.storage_path ?? null,
    };
  });

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </p>
        {items.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-muted-foreground">
            The collection is being prepared. Check back soon.
          </p>
        )}
      </main>
    </div>
  );
}
