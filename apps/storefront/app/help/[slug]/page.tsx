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
      languages: { en: `/help/${slug}`, ar: `/ar/help/${slug}` },
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
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Link href={lhref(locale, "/help")} className="text-sm text-muted-foreground hover:text-foreground">
          {t(locale, "sf.help.back")}
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t(locale, `sf.helpcat.${article.category}`)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{body}</p>

        {/* The other language stays one fold below for mixed-language households. */}
        {other.title && other.body ? (
          <div
            className="mt-10 border-t pt-6"
            dir={locale === "ar" ? "ltr" : "rtl"}
            lang={locale === "ar" ? "en" : "ar"}
          >
            <h2 className="text-xl font-semibold tracking-tight">{other.title}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{other.body}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
