import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { getLocale, lhref, pick } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "ar" ? "مركز المساعدة — باخ ويرز" : "Help Center — BACH Wears",
    alternates: { canonical: lhref(locale, "/help"), languages: { en: "/help", ar: "/ar/help" } },
  };
}

export default async function HelpPage() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { data: articles } = await supabase
    .from("help_articles")
    .select("slug, category, title_en, title_ar, body_en, body_ar")
    .order("sort");

  const byCategory = new Map<string, Array<{ slug: string; title: string }>>();
  for (const a of articles ?? []) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push({ slug: a.slug, title: pick(locale, a.title_en, a.title_ar) });
  }

  // AEO (§12): the Help Center doubles as an FAQ answer source.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (articles ?? []).map((a) => ({
      "@type": "Question",
      name: pick(locale, a.title_en, a.title_ar),
      acceptedAnswer: { "@type": "Answer", text: pick(locale, a.body_en, a.body_ar) },
    })),
  };

  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t(locale, "sf.help.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t(locale, "sf.help.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t(locale, "sf.help.sub")}</p>

        <div className="mt-10 space-y-8">
          {[...byCategory.entries()].map(([category, list]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t(locale, `sf.helpcat.${category}`)}
              </h2>
              <ul className="mt-3 divide-y rounded-md border">
                {list.map((a) => (
                  <li key={a.slug}>
                    <Link href={lhref(locale, `/help/${a.slug}`)} className="block px-4 py-3 hover:bg-muted/50">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
