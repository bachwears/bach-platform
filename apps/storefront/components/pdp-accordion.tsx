import Link from "next/link";
import { t, type Locale } from "@bach/i18n";

import { lhref } from "../lib/locale";

/** Delivery + returns disclosures under the product details (plain <details>, no JS). */
export function PdpAccordion({ locale }: { locale: Locale }) {
  return (
    <div className="mt-6 divide-y border-t text-sm">
      <details className="group py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
          {t(locale, "sf.pdp.delivery")}
          <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
        </summary>
        <p className="mt-2 leading-relaxed text-muted-foreground">{t(locale, "sf.pdp.deliveryBody")}</p>
      </details>
      <details className="group py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
          {t(locale, "sf.pdp.returnsTitle")}
          <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
        </summary>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {t(locale, "sf.pdp.returnsBody")}{" "}
          <Link href={lhref(locale, "/returns")} className="underline underline-offset-4 hover:text-foreground">
            {t(locale, "sf.pdp.returnsLink")}
          </Link>
        </p>
      </details>
    </div>
  );
}
