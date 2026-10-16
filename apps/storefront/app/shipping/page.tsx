import type { Metadata } from "next";
import { supabaseServer } from "@bach/supabase/server";

import { PolicyPage, policyFallbacks } from "../../components/policy-page";
import { shippingScopeOf } from "../../lib/shipping-scope";

export const metadata: Metadata = {
  alternates: { canonical: "/shipping" },
  title: "Delivery & Shipping — BACH Wears",
  description: "How BACH Wears delivers across Lebanon: confirmation calls, timelines, and payment on arrival.",
};

export default async function ShippingPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("site_content").select("key, value").in("key", ["page_shipping", "shipping"]);
  const page = data?.find((r) => r.key === "page_shipping")?.value;
  const scope = shippingScopeOf(data?.find((r) => r.key === "shipping")?.value);
  return <PolicyPage content={page} fallback={policyFallbacks.shipping} notice={scope.lebanonOnly ? scope.notice : undefined} />;
}
