import type { Metadata } from "next";
import { supabaseServer } from "@bach/supabase/server";

import { PolicyPage, policyFallbacks } from "../../components/policy-page";

export const metadata: Metadata = {
  title: "Delivery & Shipping — BACH Wears",
  description: "How BACH Wears delivers across Lebanon: confirmation calls, timelines, and payment on arrival.",
};

export default async function ShippingPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("site_content").select("value").eq("key", "page_shipping").maybeSingle();
  return <PolicyPage content={data?.value} fallback={policyFallbacks.shipping} />;
}
