import Link from "next/link";
import { t, type Locale } from "@bach/i18n";

import { lhref } from "../lib/locale";

/** Delivery + returns disclosures under the product details (plain <details>, no JS). */
export function PdpAccordion({ locale }: { locale: Locale }) {
  return (
    <div className="divide-y border-b">
      <details className="group py-3">
        <summary className="type-meta flex min-h-11 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          {t(locale, "sf.pdp.delivery")}
          <span className="text-base font-light transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
        </summary>
        <p className="pb-2 text-sm leading-relaxed text-muted-foreground">{t(locale, "sf.pdp.deliveryBody")}</p>
      </details>
      <details className="group py-3">
        <summary className="type-meta flex min-h-11 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          {t(locale, "sf.pdp.returnsTitle")}
          <span className="text-base font-light transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
        </summary>
        <p className="pb-2 text-sm leading-relaxed text-muted-foreground">
          {t(locale, "sf.pdp.returnsBody")}{" "}
          <Link href={lhref(locale, "/returns")} className="underline underline-offset-4 hover:text-foreground">
            {t(locale, "sf.pdp.returnsLink")}
          </Link>
        </p>
      </details>
    </div>
  );
}
