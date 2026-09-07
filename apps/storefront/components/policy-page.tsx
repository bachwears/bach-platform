import Link from "next/link";

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
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="anim-rise text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground" data-reveal>
            {p}
          </p>
        ))}
      </div>
      {cta ? (
        <Link
          href={lhref(locale, cta.href)}
          className="mt-10 inline-block border-b border-foreground pb-0.5 text-sm font-medium hover:opacity-70"
          data-reveal
        >
          {cta.label}
        </Link>
      ) : null}
    </main>
  );
}
