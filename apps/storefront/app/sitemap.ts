import type { MetadataRoute } from "next";
import { supabaseServer } from "@bach/supabase/server";

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
    alternates: {
      languages: {
        en: `${BASE}${path}`,
        ar: `${BASE}${path === "/" ? "/ar" : `/ar${path}`}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await supabaseServer();
  const now = new Date();
  const [{ data: products }, { data: articles }] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    // RLS scopes the anonymous read to customer-visible articles.
    supabase.from("help_articles").select("slug, updated_at").eq("is_published", true),
  ]);

  return [
    entry("/", now, "daily", 1),
    entry("/shop", now, "daily", 0.9),
    entry("/help", now, "weekly", 0.5),
    entry("/support", now, "monthly", 0.4),
    ...(products ?? []).map((p) =>
      entry(`/products/${p.slug}`, p.updated_at ? new Date(p.updated_at) : now, "weekly", 0.8),
    ),
    ...(articles ?? []).map((a) =>
      entry(`/help/${a.slug}`, a.updated_at ? new Date(a.updated_at) : now, "monthly", 0.4),
    ),
  ];
}
