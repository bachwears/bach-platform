import Link from "next/link";
import { t } from "@bach/i18n";

import { getLocale, lhref } from "../lib/locale";

interface PolicyContent {
  title?: string;
  body?: string;
}

// Shipped copy stays as fallback so a missing row never blanks the page.
export const policyFallbacks: Record<"shipping" | "returns", Required<PolicyContent>> = {
  shipping: {
    title: "Delivery & Shipping",
    body: "We deliver Lebanon-wide. Every order is confirmed by phone before dispatch.\n\nThe courier fee is settled on arrival — cash on delivery in USD or LBP.",
  },
  returns: {
    title: "Returns & Exchanges",
    body: "Delivered online orders can be returned or exchanged within 30 days.\n\nPieces should be unworn, unwashed, and with their original tags attached.",
  },
};

/** Editable policy page: title + plain-text body, blank line = new paragraph. */
export async function PolicyPage({
  content,
  fallback,
  cta,
}: {
  content: unknown;
  fallback: Required<PolicyContent>;
  cta?: { href: string; label: string };
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
      <div className="mt-10 space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed">
            {p}
          </p>
        ))}
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
