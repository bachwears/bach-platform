import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../components/product-card";
import { getLocale, lhref } from "../lib/locale";

interface HeroContent {
  eyebrow?: string;
  headline?: string;
  sub?: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
  image_alt?: string;
  video_url?: string;
}

export default async function Home() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  // MGMT-editable hero copy; the shipped defaults stay as fallback so a
  // missing row (or table) can never blank the homepage.
  const { data: contentRows } = await supabase
    .from("site_content")
    .select("key, value")
    .in("key", ["home_hero", "home_banner"]);
  const hero: HeroContent = (contentRows?.find((r) => r.key === "home_hero")?.value as HeroContent) ?? {};
  const banner = (contentRows?.find((r) => r.key === "home_banner")?.value ?? {}) as {
    enabled?: boolean;
    text?: string;
    cta_label?: string;
    cta_href?: string;
  };
  const { data: collectionRows } = await supabase
    .from("collections")
    .select("slug, name_en, description_en, cover_url")
    .eq("is_active", true)
    .not("cover_url", "is", null)
    .order("sort");
  const collections = collectionRows ?? [];
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
        urlTemplate: "https://bachwears.com/shop?q={search_term_string}",
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
        <section className="relative overflow-hidden md:-mt-[68px]">
          {hero.video_url ? (
            <>
              {/* Muted looping campaign film; the still stays as the poster,
                  the LCP image for slow connections, and the whole hero for
                  reduced-motion users. */}
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={hero.image_url || "/hero-campaign.jpg"}
                aria-label={hero.image_alt || t(locale, "sf.home.heroAlt")}
                className="anim-hero-settle hidden h-[46vh] w-full object-cover object-[70%_center] motion-safe:block sm:h-[60vh] md:h-[78vh]"
              >
                <source src={hero.video_url} type="video/mp4" />
              </video>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.image_url || "/hero-campaign.jpg"}
                alt={hero.image_alt || t(locale, "sf.home.heroAlt")}
                className="anim-hero-settle h-[46vh] w-full object-cover object-[70%_center] motion-safe:hidden sm:h-[60vh] md:h-[78vh]"
              />
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.image_url || "/hero-campaign.jpg"}
              srcSet={hero.image_url ? undefined : "/hero-campaign-mobile.jpg 900w, /hero-campaign.jpg 1672w"}
              sizes="100vw"
              alt={hero.image_alt || t(locale, "sf.home.heroAlt")}
              fetchPriority="high"
              className="anim-hero-settle h-[46vh] w-full object-cover object-[70%_center] sm:h-[60vh] md:h-[78vh]"
            />
          )}
          <div className="pointer-events-none md:absolute md:inset-0">
            <div className="mx-auto h-full max-w-6xl px-4">
              <div
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="pointer-events-auto ml-0 mr-auto flex h-full max-w-md flex-col justify-center py-10 text-foreground md:py-0 md:text-neutral-900"
              >
                <p
                  className="anim-rise text-xs uppercase tracking-[0.35em] text-muted-foreground md:text-neutral-600"
                  style={{ ["--anim-delay" as string]: "0.1s" }}
                >
                  {hero.eyebrow || t(locale, "sf.home.eyebrow")}
                </p>
                <h1
                  className="anim-rise mt-4 text-4xl font-semibold tracking-tight sm:text-5xl"
                  style={{ ["--anim-delay" as string]: "0.22s" }}
                >
                  {hero.headline || t(locale, "sf.home.headline")}
                </h1>
                <p
                  className="anim-rise mt-4 max-w-sm text-muted-foreground md:text-neutral-700"
                  style={{ ["--anim-delay" as string]: "0.34s" }}
                >
                  {hero.sub || t(locale, "sf.home.sub")}
                </p>
                <div className="anim-rise mt-8" style={{ ["--anim-delay" as string]: "0.48s" }}>
                  <Button
                    asChild
                    size="lg"
                    className="md:bg-neutral-900 md:text-neutral-50 md:hover:bg-neutral-800"
                  >
                    <Link href={lhref(locale, hero.cta_href || "/shop")}>{hero.cta_label || t(locale, "sf.home.cta")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {banner.enabled && banner.text ? (
          <aside className="border-b bg-foreground text-background" data-reveal>
            <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-center text-sm tracking-wide">
              <span>{banner.text}</span>
              {banner.cta_label ? (
                <Link
                  href={lhref(locale, banner.cta_href || "/shop")}
                  className="underline underline-offset-4 hover:opacity-80"
                >
                  {banner.cta_label}
                </Link>
              ) : null}
            </p>
          </aside>
        ) : null}

        {collections.length ? (
          <section className="mx-auto max-w-6xl px-4 pt-20">
            <h2 className="text-center text-sm font-semibold uppercase tracking-[0.3em]" data-reveal>
              Collections
            </h2>
            {/* BOSS-style editorial mosaic: one tall feature in the center,
                smaller tiles flanking it, two wide tiles below. */}
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {collections.slice(0, 5).map((c, i) => {
                const pos = [
                  "col-span-2 md:col-start-2 md:col-span-2 md:row-start-1 md:row-span-2", // feature
                  "md:col-start-1 md:row-start-1",
                  "md:col-start-1 md:row-start-2",
                  "md:col-start-4 md:row-start-1",
                  "md:col-start-4 md:row-start-2",
                ][i];
                return (
                  <Link
                    key={c.slug}
                    href={lhref(locale, `/shop?col=${c.slug}`)}
                    className={`group relative block overflow-hidden rounded-md bg-muted ${pos} ${i === 0 ? "aspect-[3/4]" : "aspect-[4/5] md:aspect-auto md:min-h-0"}`}
                    data-reveal
                    style={{ ["--reveal-delay" as string]: `${i * 60}ms` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.cover_url!}
                      alt={c.name_en}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-4 pt-10">
                      <span className={`block font-medium tracking-tight text-white ${i === 0 ? "text-lg" : "text-sm"}`}>
                        {c.name_en}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            {collections.length > 5 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-4 md:gap-4">
                {collections.slice(5, 7).map((c, i) => (
                  <Link
                    key={c.slug}
                    href={lhref(locale, `/shop?col=${c.slug}`)}
                    className="group relative block aspect-[16/7] overflow-hidden rounded-md bg-muted"
                    data-reveal
                    style={{ ["--reveal-delay" as string]: `${(i + 5) * 60}ms` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.cover_url!}
                      alt={c.name_en}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-[center_30%] transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-4 pt-10">
                      <span className="block text-sm font-medium tracking-tight text-white">{c.name_en}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {featured.length ? (
          <section className="mx-auto max-w-6xl px-4 py-20">
            <div className="mb-8 flex items-end justify-between" data-reveal>
              <h2 className="text-xl font-semibold tracking-tight">{t(locale, "sf.nav.newIn")}</h2>
              <Link href={lhref(locale, "/shop")} className="text-sm text-muted-foreground hover:text-foreground">
                {t(locale, "sf.nav.viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
              {featured.map((p, i) => (
                <ProductCard key={p.slug} product={p} locale={locale} revealDelay={i * 70} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
