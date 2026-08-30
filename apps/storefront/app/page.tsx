import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

import { ProductCard, type CardProduct } from "../components/product-card";
import { SiteHeader } from "../components/site-header";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: products } = await supabase
    .from("products")
    .select("slug, name_en, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4);

  const featured: CardProduct[] = (products ?? []).map((p) => {
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
      <main>
        <section className="mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Menswear · Lebanon
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Dress with intent.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Considered menswear, built to last beyond the season.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/shop">Shop the collection</Link>
          </Button>
        </section>

        {featured.length ? (
          <section className="mx-auto max-w-6xl px-4 pb-24">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-xl font-semibold tracking-tight">New in</h2>
              <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-muted-foreground">
          © BACH Wears — bachwears.com
        </div>
      </footer>
    </div>
  );
}
