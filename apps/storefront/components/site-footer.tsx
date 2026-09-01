import Link from "next/link";
import { t } from "@bach/i18n";

import { NewsletterForm } from "./newsletter-form";
import { getLocale, lhref } from "../lib/locale";

export async function SiteFooter() {
  const locale = await getLocale();
  const links: Array<[string, string]> = [
    ["/shop", t(locale, "sf.footer.shop")],
    ["/help", t(locale, "sf.footer.help")],
    ["/support", t(locale, "sf.footer.support")],
    ["/returns", t(locale, "sf.footer.returns")],
  ];

  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto]">
        <div className="max-w-sm">
          <p className="text-sm font-semibold tracking-tight">{t(locale, "sf.nl.heading")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(locale, "sf.nl.sub")}</p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={lhref(locale, href)}
              className="text-muted-foreground hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <span>© BACH Wears — bachwears.com</span>
          <span dir="ltr">{t(locale, "sf.footer.contact")}</span>
        </div>
      </div>
    </footer>
  );
}
