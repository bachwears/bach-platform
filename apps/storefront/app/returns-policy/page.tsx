import type { Metadata } from "next";
import { supabaseServer } from "@bach/supabase/server";

import { PolicyPage, policyFallbacks } from "../../components/policy-page";

export const metadata: Metadata = {
  title: "Returns & Exchanges — BACH Wears",
  description: "The BACH Wears returns policy: 30-day window, condition requirements, and how to start a return.",
};

export default async function ReturnsPolicyPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("site_content").select("value").eq("key", "page_returns").maybeSingle();
  return <PolicyPage content={data?.value} fallback={policyFallbacks.returns} cta={{ href: "/returns", label: "Start a return" }} />;
}
