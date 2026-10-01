import Link from "next/link";
import { t } from "@bach/i18n";

import { NewsletterForm } from "./newsletter-form";
import { getLocale, lhref } from "../lib/locale";

type FooterLink = { href: string; label: string; external?: boolean };

export async function SiteFooter() {
  const locale = await getLocale();
  const columns: Array<{ heading: string; links: FooterLink[] }> = [
    {
      heading: t(locale, "sf.footer.colHelp"),
      links: [
        { href: "/help", label: t(locale, "sf.footer.help") },
        { href: "/support", label: t(locale, "sf.footer.support") },
        { href: "/support/track", label: t(locale, "sf.nav.trackOrder") },
        { href: "/returns", label: t(locale, "sf.footer.returns") },
      ],
    },
    {
      heading: t(locale, "sf.footer.colContact"),
      links: [
        { href: "https://wa.me/96171566296", label: "WhatsApp +961 71 566 296", external: true },
        { href: "mailto:care@bachwears.com", label: "care@bachwears.com", external: true },
      ],
    },
    {
      heading: "BACH",
      links: [
        { href: "/shop", label: t(locale, "sf.footer.shop") },
        { href: "/account", label: t(locale, "sf.nav.account") },
      ],
    },
    {
      heading: t(locale, "sf.footer.colPolicies"),
      links: [
        { href: "/shipping", label: t(locale, "sf.footer.shipping") },
        { href: "/returns-policy", label: t(locale, "sf.footer.returnsPolicy") },
      ],
    },
  ];

  return (
    <footer className="mt-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="max-w-md">
          <p className="type-heading">{t(locale, "sf.nl.heading")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t(locale, "sf.nl.sub")}</p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
        </div>

        <nav aria-label="Footer" className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="type-heading mb-3">{col.heading}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target={l.href.startsWith("http") ? "_blank" : undefined}
                        rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                        className={`type-meta block py-2 text-muted-foreground hover:text-foreground md:py-1 ${l.href.startsWith("mailto:") ? "normal-case" : ""}`}
                        dir="ltr"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={lhref(locale, l.href)}
                        className="type-meta block py-2 text-muted-foreground hover:text-foreground md:py-1"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="type-meta mt-16 pb-10 text-muted-foreground">© BACH Wears · Menswear, Lebanon</p>
      </div>
    </footer>
  );
}
