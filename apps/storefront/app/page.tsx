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
    .select("slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path), product_variants(color_en, is_active)")
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
      colors: ((p.product_variants as unknown as Array<{ color_en: string; is_active: boolean }>) ?? [])
        .filter((v) => v.is_active)
        .map((v) => v.color_en),
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
        {/* Campaign hero — the copy sits on the stone-wall negative space,
            which is physically LEFT in the art direction, so the text block
            stays pinned left in both locales. */}
        <section className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-campaign.jpg"
            srcSet="/hero-campaign-mobile.jpg 900w, /hero-campaign.jpg 1672w"
            sizes="100vw"
            alt={t(locale, "sf.home.heroAlt")}
            fetchPriority="high"
            className="h-[46vh] w-full object-cover object-[72%_center] sm:h-[60vh] md:h-[78vh]"
          />
          <div className="pointer-events-none md:absolute md:inset-0">
            <div className="mx-auto h-full max-w-6xl px-4">
              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="pointer-events-auto ml-0 mr-auto flex h-full max-w-md flex-col justify-center py-10 text-foreground md:py-0 md:text-neutral-900"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground md:text-neutral-600">
                  {t(locale, "sf.home.eyebrow")}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t(locale, "sf.home.headline")}
                </h1>
                <p className="mt-4 max-w-sm text-muted-foreground md:text-neutral-700">
                  {t(locale, "sf.home.sub")}
                </p>
                <div className="mt-8">
                  <Button
                    asChild
                    size="lg"
                    className="md:bg-neutral-900 md:text-neutral-50 md:hover:bg-neutral-800"
                  >
                    <Link href={lhref(locale, "/shop")}>{t(locale, "sf.home.cta")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {featured.length ? (
          <section className="mx-auto max-w-6xl px-4 py-20">
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
    </div>
  );
}
