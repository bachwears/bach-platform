import { supabaseServer } from "@bach/supabase/server";

import type { PolicyContent } from "../components/policy-page";

export const LEGAL_PAGES = [
  { key: "page_privacy", path: "/privacy", label: "Privacy policy" },
  { key: "page_terms", path: "/terms", label: "Terms of sale" },
] as const;

/** Legal page rows from site_content; a page only counts as live once MGMT marks it published. */
export async function getLegalContent(): Promise<Record<string, PolicyContent>> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("site_content")
    .select("key, value")
    .in(
      "key",
      LEGAL_PAGES.map((p) => p.key),
    );
  return Object.fromEntries((data ?? []).map((r) => [r.key, (r.value ?? {}) as PolicyContent]));
}

export async function publishedLegalPages() {
  const content = await getLegalContent();
  return LEGAL_PAGES.filter((p) => content[p.key]?.published === true);
}
