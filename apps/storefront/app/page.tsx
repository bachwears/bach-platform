import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { HomeSlides } from "../components/home-slides";
import { ProductCard, type CardProduct } from "../components/product-card";
import { hoverPhoto } from "../lib/media";
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
    .select("slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path, color_en, sort), product_variants(color_en, is_active)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(24);

  const featured: CardProduct[] = (products ?? []).map((p) => {
    const media = (p.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? [];
    return {
      slug: p.slug,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      front: media.find((m) => m.kind === "front")?.storage_path ?? null,
      back: hoverPhoto(media),
      colors: ((p.product_variants as unknown as Array<{ color_en: string; is_active: boolean }>) ?? [])
        .filter((v) => v.is_active)
        .map((v) => v.color_en),
    };
  })
    .filter((p) => p.front)
    .slice(0, 8);

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
        urlTemplate: "https://bachwears.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const heroAlt = hero.image_alt || t(locale, "sf.home.heroAlt");
  const heroImg = hero.image_url || "/hero-campaign.jpg";

  // Slide 1 is the MGMT-editable campaign; each collection with a cover
  // follows. Covers are portrait 3:4, so on desktop a slide splits into
  // photo + type panel instead of cropping the photo to a landscape band.
  const slides = [
    <div key="hero" className="relative h-full w-full overflow-hidden bg-[#d6d1c9]">
      {hero.video_url ? (
        <>
          {/* Muted looping campaign film; the still is the poster and the
              whole hero for reduced-motion users. */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroImg}
            aria-label={heroAlt}
            className="absolute inset-0 hidden h-full w-full object-cover object-[55%_center] motion-safe:block lg:object-[70%_center]"
          >
            <source src={hero.video_url} type="video/mp4" />
          </video>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImg}
            alt={heroAlt}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[70%_center] motion-safe:hidden"
          />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImg}
          srcSet={hero.image_url ? undefined : "/hero-campaign-mobile.jpg 900w, /hero-campaign.jpg 1672w"}
          sizes="100vw"
          alt={heroAlt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
        />
      )}
      {/* Phones: white copy over a soft scrim at the foot, clear of the faces.
          Desktop: dark copy on the open stone wall (shot light in both themes). */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent lg:hidden" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-16 text-white sm:px-8 lg:inset-y-0 lg:flex lg:max-w-xl lg:flex-col lg:justify-center lg:pb-0 lg:text-neutral-900">
        <p className="type-meta">{hero.eyebrow || t(locale, "sf.home.eyebrow")}</p>
        <h1 className="type-display mt-3 text-[2.5rem] sm:text-6xl lg:text-7xl">
          {hero.headline || t(locale, "sf.home.headline")}
        </h1>
        <p className="mt-4 hidden max-w-sm text-sm sm:block">{hero.sub || t(locale, "sf.home.sub")}</p>
        <Link
          href={lhref(locale, hero.cta_href || "/shop")}
          className="type-label mt-5 inline-block self-start underline underline-offset-4 hover:opacity-60"
        >
          {hero.cta_label || t(locale, "sf.home.cta")}
        </Link>
      </div>
    </div>,
    ...collections.map((c, i) => (
      <Link
        key={c.slug}
        href={lhref(locale, `/shop?col=${c.slug}`)}
        className="group relative flex h-full w-full lg:flex-row-reverse"
      >
        <div className="relative h-full w-full lg:w-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            // a "-wide" cover is the banner crop; slides want the portrait original
            src={c.cover_url!.replace(/-wide(\.\w+)$/, "$1")}
            alt={c.name_en}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
          />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent lg:hidden" />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-16 text-white sm:px-8 lg:static lg:flex lg:w-1/2 lg:min-w-0 lg:flex-col lg:justify-end lg:pb-24 lg:pe-12 lg:text-foreground">
          <p className="type-meta">{t(locale, "sf.home.collection")}</p>
          <h2 className="type-display mt-3 text-5xl [overflow-wrap:anywhere] sm:text-6xl lg:text-6xl xl:text-7xl 2xl:text-8xl">{c.name_en}</h2>
          {c.description_en ? (
            <p className="mt-5 hidden max-w-sm text-sm text-muted-foreground lg:block">{c.description_en}</p>
          ) : null}
          <span className="type-label mt-5 inline-block self-start underline underline-offset-4 group-hover:opacity-60">
            {t(locale, "sf.home.view")}
          </span>
        </div>
      </Link>
    )),
  ];

  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      <main>
        <HomeSlides labels={{ prev: t(locale, "sf.home.prev"), next: t(locale, "sf.home.next") }}>{slides}</HomeSlides>

        {banner.enabled && banner.text ? (
          <aside className="border-b">
            <p className="type-meta mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-center sm:px-8">
              <span>{banner.text}</span>
              {banner.cta_label ? (
                <Link
                  href={lhref(locale, banner.cta_href || "/shop")}
                  className="underline underline-offset-4 hover:opacity-60"
                >
                  {banner.cta_label}
                </Link>
              ) : null}
            </p>
          </aside>
        ) : null}

        {featured.length ? (
          <section className="mx-auto max-w-[1440px] px-4 pb-20 sm:px-8">
            {/* Editorial intro between the campaign and the newest pieces. */}
            <div className="flex flex-col items-center py-24 text-center sm:py-32">
              <h2 className="type-display text-5xl sm:text-6xl">{t(locale, "sf.home.theNew")}</h2>
              <p className="type-meta mt-3">{t(locale, "sf.home.scrollDown")}</p>
              <span aria-hidden className="scroll-cue mt-10" />
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
              ))}
            </div>
            <p className="mt-14 text-center">
              <Link href={lhref(locale, "/shop")} className="type-label underline underline-offset-4 hover:opacity-60">
                {t(locale, "sf.nav.viewAll")}
              </Link>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
