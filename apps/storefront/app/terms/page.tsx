import type { Metadata } from "next";

import { PolicyPage, policyFallbacks } from "../../components/policy-page";
import { getLegalContent } from "../../lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const content = (await getLegalContent())["page_terms"];
  const live = content?.published === true;
  return {
    title: `${content?.title || "Terms of Sale"} — BACH Wears`,
    description: "The terms that apply to orders placed on bachwears.com.",
    alternates: { canonical: "/terms" },
    // drafts stay out of search until MGMT marks them published
    robots: live ? undefined : { index: false, follow: true },
  };
}

export default async function Page() {
  const content = (await getLegalContent())["page_terms"];
  return <PolicyPage content={content} fallback={policyFallbacks.terms} draft={content?.published !== true} />;
}
