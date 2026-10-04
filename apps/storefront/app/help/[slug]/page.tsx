import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { getLocale, lhref, pick } from "../../../lib/locale";

const BASE = "https://bachwears.com";

/** One line, cut on a word boundary: a search-result snippet of the article body. */
function snippet(body: string, max = 155): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

/**
 * Q&A pairs when the article reads as questions and answers: lines ending in "?"
 * each followed by their answer (two or more), or a single question as the title.
 */
function qaPairs(title: string, body: string): Array<{ q: string; a: string }> {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const pairs: Array<{ q: string; a: string }> = [];
  for (const line of lines) {
    if (/[?؟]$/.test(line)) pairs.push({ q: line, a: "" });
    else if (pairs.length) pairs[pairs.length - 1]!.a += `${pairs[pairs.length - 1]!.a ? " " : ""}${line}`;
  }
  const answered = pairs.filter((p) => p.a);
  if (answered.length >= 2) return answered;
  return /[?؟]$/.test(title.trim()) ? [{ q: title.trim(), a: body.replace(/\s+/g, " ").trim() }] : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const supabase = await supabaseServer();
  const { data: a } = await supabase.from("help_articles").select("title_en, title_ar, body_en, body_ar").eq("slug", slug).maybeSingle();
  const body = a ? pick(locale, a.body_en, a.body_ar) : "";
  const title = a ? `${pick(locale, a.title_en, a.title_ar)} — BACH Wears Help` : undefined;
  const description = body ? snippet(body) : undefined;
  return {
    title,
    description,
    alternates: {
      canonical: lhref(locale, `/help/${slug}`),
    },
    openGraph: { title, description, type: "article", url: lhref(locale, `/help/${slug}`) },
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const supabase = await supabaseServer();
  const { data: article } = await supabase
    .from("help_articles")
    .select("title_en, title_ar, body_en, body_ar, category, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!article) notFound();

  const title = pick(locale, article.title_en, article.title_ar);
  const body = pick(locale, article.body_en, article.body_ar);
  const url = `${BASE}${lhref(locale, `/help/${slug}`)}`;

  // AEO (§12): Q&A-shaped articles are marked up as an FAQ, the rest as an Article.
  const qa = qaPairs(title, body);
  const org = { "@type": "Organization", name: "BACH Wears", url: BASE };
  const articleLd = qa.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        url,
        inLanguage: locale,
        mainEntity: qa.map((p) => ({
          "@type": "Question",
          name: p.q,
          acceptedAnswer: { "@type": "Answer", text: p.a },
        })),
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: snippet(body),
        articleBody: body,
        articleSection: article.category,
        inLanguage: locale,
        url,
        mainEntityOfPage: url,
        ...(article.updated_at ? { dateModified: article.updated_at } : {}),
        author: org,
        publisher: { ...org, logo: { "@type": "ImageObject", url: `${BASE}/logo-bach.png` } },
      };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t(locale, "sf.help.eyebrow"), item: `${BASE}${lhref(locale, "/help")}` },
      { "@type": "ListItem", position: 2, name: title, item: url },
    ],
  };
  // "<" escaped so article text can never close the script tag
  const ld = (v: object) => JSON.stringify(v).replace(/</g, "\\u003c");

  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbLd) }} />
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

      </main>
    </div>
  );
}
