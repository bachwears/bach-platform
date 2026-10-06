import Link from "next/link";
import { t } from "@bach/i18n";

import { getLocale, lhref } from "../lib/locale";

export interface PolicyContent {
  title?: string;
  body?: string;
  /** legal pages only: false = draft under review (noindex, not in the footer) */
  published?: boolean;
}

// Shipped copy stays as fallback so a missing row never blanks the page.
export const policyFallbacks: Record<"shipping" | "returns" | "privacy" | "terms", { title: string; body: string }> = {
  shipping: {
    title: "Delivery & Shipping",
    body: "We deliver Lebanon-wide. Every order is confirmed by phone before dispatch.\n\nThe courier fee is settled on arrival — cash on delivery in USD or LBP.",
  },
  returns: {
    title: "Returns & Exchanges",
    body: "Returns are accepted within 3 days and exchanges within 7 days of the day you receive your order.\n\nPieces should be unworn, unwashed, and with their original tags attached. A $5 delivery fee applies to returns and exchanges of delivered orders.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "This page is being finalised. For any question about your personal data, write to care@bachwears.com.",
  },
  terms: {
    title: "Terms of Sale",
    body: "This page is being finalised. For any question about an order, write to care@bachwears.com.",
  },
};

/**
 * Editable policy page. Body is plain text: a blank line starts a new block,
 * a block starting "## " is a section heading, and a block whose lines all
 * start with "- " is a bullet list.
 */
export async function PolicyPage({
  content,
  fallback,
  cta,
  draft,
}: {
  content: unknown;
  fallback: { title: string; body: string };
  cta?: { href: string; label: string };
  /** show the "draft under review" note above the text */
  draft?: boolean;
}) {
  const locale = await getLocale();
  const c = (content ?? {}) as PolicyContent;
  const title = c.title || fallback.title;
  const body = c.body || fallback.body;
  const paragraphs = body.split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
      <nav aria-label="Breadcrumb" className="type-meta text-muted-foreground">
        <Link href={lhref(locale, "/help")} className="hover:text-foreground">
          {t(locale, "sf.help.eyebrow")}
        </Link>
        <span aria-hidden> / </span>
        <span>{title}</span>
      </nav>
      <h1 className="type-display mt-6 text-4xl sm:text-5xl">{title}</h1>
      {draft ? (
        <p className="type-meta mt-8 border border-foreground px-4 py-3">{t(locale, "sf.policy.draft")}</p>
      ) : null}
      <div className="mt-10 space-y-5">
        {paragraphs.map((p, i) => {
          const lines = p.trim().split("\n");
          if (lines.length === 1 && lines[0]!.startsWith("## ")) {
            return (
              <h2 key={i} className="type-heading pt-6">
                {lines[0]!.slice(3)}
              </h2>
            );
          }
          if (lines.every((l) => l.trim().startsWith("- "))) {
            return (
              <ul key={i} className="space-y-2 ps-4 text-sm leading-relaxed">
                {lines.map((l, j) => (
                  <li key={j} className="list-[square] marker:text-muted-foreground">
                    {l.trim().slice(2)}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="whitespace-pre-line text-sm leading-relaxed">
              {p.trim()}
            </p>
          );
        })}
      </div>
      {cta ? (
        <Link
          href={lhref(locale, cta.href)}
          className="type-label mt-12 grid h-12 w-full place-items-center border border-foreground hover:bg-secondary sm:w-auto sm:px-10 sm:inline-grid"
        >
          {cta.label}
        </Link>
      ) : null}
    </main>
  );
}
