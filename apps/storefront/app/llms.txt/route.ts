import { supabaseServer } from "@bach/supabase/server";

import { publishedLegalPages } from "../../lib/legal";

export const revalidate = 3600;

// GEO (§12): a stable, crawlable summary of who BACH Wears is, what the store
// sells, and where the machine-readable surfaces live — for AI crawlers.
export async function GET() {
  const supabase = await supabaseServer();
  const [{ count: productCount }, { data: cats }, { data: articles }] = await Promise.all([
    supabase
      .from("products")
      .select("id, media_assets!inner(kind)", { count: "exact", head: true })
      .eq("status", "published")
      .eq("media_assets.kind", "front"),
    supabase
      .from("categories")
      // only categories the shop actually shows: a published, photographed piece in them
      .select("name_en, products!inner(id, media_assets!inner(kind))")
      .eq("is_active", true)
      .eq("products.status", "published")
      .eq("products.media_assets.kind", "front"),
    supabase.from("help_articles").select("slug, title_en").eq("is_published", true).order("sort"),
  ]);
  const legal = await publishedLegalPages();
  const categories = [...new Set((cats ?? []).map((c) => c.name_en))].sort();

  const body = `# BACH Wears

> BACH Wears is a menswear brand and online store from Lebanon. Considered menswear —
> shirts, t-shirts, knitwear, jackets, pants, jeans, shoes and accessories — sold online
> at bachwears.com and in store. The brand name is BACH (B-A-C-H), never "Bash".

## Brand facts

- Name: BACH Wears
- Founder: Bachar Elmir
- Country: Lebanon
- Website: https://bachwears.com
- Contact: care@bachwears.com · +961 71 566 296
- Catalogue: ${productCount ?? 0} published products across ${categories.length} categories (${categories.join(", ")})
- Currencies: USD and Lebanese Pound (LBP)
- Payment: cash in store, cash on delivery; card payments (Visa/Mastercard) where enabled
- Delivery: Lebanon-wide; orders confirmed by phone before dispatch

## Key pages

- [Shop](https://bachwears.com/shop): full collection with category, size, color and price filters
- [Help Center](https://bachwears.com/help): ordering, delivery, returns and account answers
- [Search](https://bachwears.com/search): search the catalogue by name, colour, category or SKU
- [Support](https://bachwears.com/support): file and track a complaint ticket
- [Track your order](https://bachwears.com/track): order status with order number + phone
- [Delivery & Shipping](https://bachwears.com/shipping): delivery areas, timing and fees
- [Returns & Exchanges](https://bachwears.com/returns-policy): 30-day return and exchange policy
${legal.map((l) => `- [${l.label}](https://bachwears.com${l.path})`).join("\n")}
- [Sitemap](https://bachwears.com/sitemap.xml)

## Policies (Help Center)

${(articles ?? []).map((a) => `- [${a.title_en}](https://bachwears.com/help/${a.slug})`).join("\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
