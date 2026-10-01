import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { getLocale, lhref, pick } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "ar" ? "مركز المساعدة — باخ ويرز" : "Help Center — BACH Wears",
    alternates: { canonical: lhref(locale, "/help") },
  };
}

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw = "" } = await searchParams;
  const q = raw.trim();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { data: articles } = await supabase
    .from("help_articles")
    .select("slug, category, title_en, title_ar, body_en, body_ar")
    .order("sort");
  const all = (articles ?? []).map((a) => ({
    slug: a.slug,
    category: a.category,
    title: pick(locale, a.title_en, a.title_ar),
    body: pick(locale, a.body_en, a.body_ar),
  }));

  const byCategory = new Map<string, typeof all>();
  for (const a of all) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? all.filter((a) => words.every((w) => `${a.title} ${a.body}`.toLowerCase().includes(w)))
    : [];

  // AEO (§12): the Help Center doubles as an FAQ answer source.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((a) => ({
      "@type": "Question",
      name: a.title,
      acceptedAnswer: { "@type": "Answer", text: a.body },
    })),
  };

  const rows = (list: typeof all) => (
    <ul className="border-t">
      {list.map((a) => (
        <li key={a.slug}>
          <Link
            href={lhref(locale, `/help/${a.slug}`)}
            className="type-label flex min-h-14 items-center justify-between gap-6 border-b py-3 hover:opacity-60"
          >
            <span>{a.title}</span>
            <ChevronRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" strokeWidth={1} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
        <p className="type-meta text-muted-foreground">{t(locale, "sf.help.eyebrow")}</p>
        <h1 className="type-display mt-3 text-4xl sm:text-5xl">{t(locale, "sf.help.title")}</h1>
        <form role="search" action={lhref(locale, "/help")} className="mt-8 flex items-end gap-4">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t(locale, "sf.help.searchPlaceholder")}
            aria-label={t(locale, "sf.help.searchPlaceholder")}
            className="type-label h-12 min-w-0 flex-1 border-0 border-b border-foreground bg-transparent px-0 outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="type-label h-12 shrink-0 hover:opacity-60">
            {t(locale, "sf.shop.searchButton")}
          </button>
        </form>

        {words.length ? (
          <section className="mt-12">
            <h2 className="type-heading mb-4">
              {matches.length ? t(locale, "sf.help.results", { q }) : t(locale, "sf.help.noResults", { q })}
            </h2>
            {matches.length ? rows(matches) : null}
            <Link href={lhref(locale, "/help")} className="type-meta mt-6 inline-block underline underline-offset-4 hover:opacity-60">
              {t(locale, "sf.help.allTopics")}
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-14">
              <h2 className="type-heading mb-4">{t(locale, "sf.help.faq")}</h2>
              {rows(all.slice(0, 6))}
            </section>
            {[...byCategory.entries()].map(([category, list]) => (
              <section key={category} className="mt-14">
                <h2 className="type-heading mb-4">{t(locale, `sf.helpcat.${category}`)}</h2>
                {rows(list)}
              </section>
            ))}
          </>
        )}

        <section className="mt-16 border-t pt-10">
          <h2 className="type-heading">{t(locale, "sf.help.contact")}</h2>
          <p className="mt-3 text-xs text-muted-foreground">{t(locale, "sf.help.sub")}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://wa.me/96171566296"
              target="_blank"
              rel="noreferrer"
              className="type-label grid h-12 flex-1 place-items-center bg-foreground text-background hover:opacity-90"
            >
              WhatsApp
            </a>
            <a href="mailto:care@bachwears.com" className="type-label grid h-12 flex-1 place-items-center border border-foreground hover:bg-secondary">
              {t(locale, "sf.help.email")}
            </a>
            <Link href={lhref(locale, "/support")} className="type-label grid h-12 flex-1 place-items-center border border-foreground hover:bg-secondary">
              {t(locale, "sf.footer.support")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
