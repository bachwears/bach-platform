import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { getLocale, lhref, pick } from "../../../lib/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  return {
    alternates: {
      canonical: lhref(locale, `/help/${slug}`),
    },
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const supabase = await supabaseServer();
  const { data: article } = await supabase
    .from("help_articles")
    .select("title_en, title_ar, body_en, body_ar, category")
    .eq("slug", slug)
    .maybeSingle();
  if (!article) notFound();

  const title = pick(locale, article.title_en, article.title_ar);
  const body = pick(locale, article.body_en, article.body_ar);
  const other = locale === "ar" ? { title: article.title_en, body: article.body_en } : { title: article.title_ar, body: article.body_ar };

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
        <nav aria-label="Breadcrumb" className="type-meta text-muted-foreground">
          <Link href={lhref(locale, "/help")} className="hover:text-foreground">
            {t(locale, "sf.help.eyebrow")}
          </Link>
          <span aria-hidden> / </span>
          <span>{t(locale, `sf.helpcat.${article.category}`)}</span>
        </nav>
        <h1 className="type-label mt-6 text-[15px]">{title}</h1>
        <p className="mt-6 whitespace-pre-line text-sm leading-relaxed">{body}</p>
        <Link href={lhref(locale, "/help")} className="type-meta mt-10 inline-block underline underline-offset-4 hover:opacity-60">
          {t(locale, "sf.help.allTopics")}
        </Link>

        {/* The other language stays one fold below for mixed-language households. */}
        {other.title && other.body ? (
          <div
            className="mt-16 border-t pt-8"
            dir={locale === "ar" ? "ltr" : "rtl"}
            lang={locale === "ar" ? "en" : "ar"}
          >
            <h2 className="text-[15px]">{other.title}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{other.body}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
