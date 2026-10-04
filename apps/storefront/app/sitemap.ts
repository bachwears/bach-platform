import type { MetadataRoute } from "next";
import { supabaseServer } from "@bach/supabase/server";

import { publishedLegalPages } from "../lib/legal";

const BASE = "https://bachwears.com";

function entry(
  path: string,
  lastModified: Date,
  changeFrequency: "daily" | "weekly" | "monthly",
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await supabaseServer();
  const now = new Date();
  const legal = await publishedLegalPages();
  const [{ data: products }, { data: articles }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_at, category_id, media_assets!inner(kind)")
      .eq("status", "published")
      .eq("media_assets.kind", "front")
      .order("created_at", { ascending: false }),
    // RLS scopes the anonymous read to customer-visible articles.
    supabase.from("help_articles").select("slug, updated_at").eq("is_published", true),
    supabase.from("categories").select("id, code, parent_id").eq("is_active", true),
  ]);

  // Category pages that show something: every category holding a photographed
  // piece, plus each category above it.
  const listed = new Set<string>();
  for (const p of products ?? []) {
    for (let c = (cats ?? []).find((k) => k.id === p.category_id); c && !listed.has(c.code); ) {
      listed.add(c.code);
      const parent = c.parent_id;
      c = (cats ?? []).find((k) => k.id === parent);
    }
  }

  return [
    entry("/", now, "daily", 1),
    entry("/shop", now, "daily", 0.9),
    ...[...listed].map((code) => entry(`/shop?cat=${encodeURIComponent(code)}`, now, "daily", 0.7)),
    entry("/help", now, "weekly", 0.5),
    entry("/shipping", now, "monthly", 0.4),
    entry("/returns-policy", now, "monthly", 0.4),
    entry("/support", now, "monthly", 0.4),
    entry("/track", now, "monthly", 0.3),
    ...legal.map((p) => entry(p.path, now, "monthly", 0.3)),
    ...(products ?? []).map((p) =>
      entry(`/products/${p.slug}`, p.updated_at ? new Date(p.updated_at) : now, "weekly", 0.8),
    ),
    ...(articles ?? []).map((a) =>
      entry(`/help/${a.slug}`, a.updated_at ? new Date(a.updated_at) : now, "monthly", 0.4),
    ),
  ];
}
