import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../components/product-card";
import { getLocale, lhref } from "../lib/locale";

export default async function Home() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { data: products } = await supabase
    .from("products")
    .select("slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4);

  const featured: CardProduct[] = (products ?? []).map((p) => {
    const media = (p.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? [];
    return {
      slug: p.slug,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      front: media.find((m) => m.kind === "front")?.storage_path ?? null,
      back: media.find((m) => m.kind === "back")?.storage_path ?? null,
    };
  });

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BACH Wears",
    url: "https://bachwears.com",
    founder: { "@type": "Person", name: "Bachar Elmir" },
    address: { "@type": "PostalAddress", addressCountry: "LB" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "care@bachwears.com",
      telephone: "+961-71-566-296",
      availableLanguage: ["en", "ar"],
    },
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BACH Wears",
    url: "https://bachwears.com",
    inLanguage: [locale === "ar" ? "ar" : "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://bachwears.com${locale === "ar" ? "/ar" : ""}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {t(locale, "sf.home.eyebrow")}
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {t(locale, "sf.home.headline")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">{t(locale, "sf.home.sub")}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href={lhref(locale, "/shop")}>{t(locale, "sf.home.cta")}</Link>
          </Button>
        </section>

        {featured.length ? (
          <section className="mx-auto max-w-6xl px-4 pb-24">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-xl font-semibold tracking-tight">{t(locale, "sf.nav.newIn")}</h2>
              <Link href={lhref(locale, "/shop")} className="text-sm text-muted-foreground hover:text-foreground">
                {t(locale, "sf.nav.viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
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
