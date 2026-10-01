import type { Metadata } from "next";

import { PolicyPage, policyFallbacks } from "../../components/policy-page";
import { getLegalContent } from "../../lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const content = (await getLegalContent())["page_privacy"];
  const live = content?.published === true;
  return {
    title: `${content?.title || "Privacy Policy"} — BACH Wears`,
    description: "How BACH Wears collects, uses and protects your personal data.",
    alternates: { canonical: "/privacy" },
    // drafts stay out of search until MGMT marks them published
    robots: live ? undefined : { index: false, follow: true },
  };
}

export default async function Page() {
  const content = (await getLegalContent())["page_privacy"];
  return <PolicyPage content={content} fallback={policyFallbacks.privacy} draft={content?.published !== true} />;
}
