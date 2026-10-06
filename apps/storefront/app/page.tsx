import Link from "next/link";
import { getHomeCollections, getSiteContent } from "../lib/cached";
import { t } from "@bach/i18n";

import { ScrollToShop } from "../components/scroll-to-shop";
import { getLocale, lhref } from "../lib/locale";

interface HeroContent {
  eyebrow?: string;
  headline?: string;
  sub?: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
  /** vertical photo for phones (MGMT); without it phones crop the desktop one */
  image_mobile_url?: string;
  image_alt?: string;
  video_url?: string;
}

export default async function Home() {
  const locale = await getLocale();
  // MGMT-editable hero copy; the shipped defaults stay as fallback so a
  // missing row (or table) can never blank the homepage.
  const [content, collections] = await Promise.all([getSiteContent(), getHomeCollections()]);
  const hero: HeroContent = (content.home_hero as HeroContent) ?? {};
  const banner = (content.home_banner ?? {}) as {
    enabled?: boolean;
    text?: string;
    cta_label?: string;
    cta_href?: string;
  };
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

  // Three full-height pictures stacked down the page, no type on them: the
  // MGMT campaign, then the first two collections (MGMT collection order).
  // Collection covers come portrait for phones and as a "-wide" crop for desktop.
  const picture = "relative block h-[calc(100dvh-4rem)] min-h-[520px] w-full overflow-hidden bg-[#d6d1c9] max-md:h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom,0px))]";
  // MGMT can hide every collection from the site in one switch
  const collectionsOn = (content.collections as { visible?: boolean } | undefined)?.visible !== false;
  const tiles = collectionsOn ? collections.slice(0, 2) : [];
  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      <main>
        <h1 className="sr-only">{hero.headline || t(locale, "sf.home.headline")}</h1>
        <Link href={lhref(locale, hero.cta_href || "/shop")} aria-label={hero.cta_label || t(locale, "sf.home.cta")} className={picture}>
          {hero.video_url ? (
            <>
              {/* Muted looping campaign film; the still is the poster and the
                  whole picture for reduced-motion users. */}
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
              <img src={heroImg} alt={heroAlt} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[70%_center] motion-safe:hidden" />
            </>
          ) : (
            <picture>
              {/* phones get the vertical photo when MGMT has one */}
              {hero.image_mobile_url ? <source media="(max-width: 767px)" srcSet={hero.image_mobile_url} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg}
                srcSet={hero.image_url ? undefined : "/hero-campaign-mobile.jpg 900w, /hero-campaign.jpg 1672w"}
                sizes="100vw"
                alt={heroAlt}
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
              />
            </picture>
          )}
        </Link>

        {tiles.map((c) => (
          <Link key={c.slug} href={lhref(locale, `/shop?col=${c.slug}`)} aria-label={c.name_en} className={picture}>
            <picture>
              <source media="(min-width: 1024px)" srcSet={c.cover_url!} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.cover_mobile_url || c.cover_url!.replace(/-wide(\.\w+)$/, "$1")}
                alt={c.name_en}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
              />
            </picture>
          </Link>
        ))}

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

        <ScrollToShop href={lhref(locale, "/shop")} title={t(locale, "sf.home.theNew")} cue={t(locale, "sf.home.scrollDown")} />
      </main>
    </div>
  );
}
