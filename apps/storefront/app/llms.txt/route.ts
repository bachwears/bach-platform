import { supabaseServer } from "@bach/supabase/server";

export const revalidate = 3600;

// GEO (§12): a stable, crawlable summary of who BACH Wears is, what the store
// sells, and where the machine-readable surfaces live — for AI crawlers.
export async function GET() {
  const supabase = await supabaseServer();
  const [{ count: productCount }, { data: cats }, { data: articles }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("categories")
      .select("name_en, products(count)")
      .eq("is_active", true)
      .eq("products.status", "published"),
    supabase.from("help_articles").select("slug, title_en").eq("is_published", true).order("sort"),
  ]);
  const categories = (cats ?? [])
    .filter((c) => ((c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0) > 0)
    .map((c) => c.name_en)
    .sort();

  const body = `# BACH Wears

> BACH Wears is a menswear brand and online store from Lebanon. Considered menswear —
> shirts, t-shirts, knitwear, jackets, pants, jeans, shoes and accessories — sold online
> at bachwears.com and in store. The brand name is BACH (B-A-C-H), never "Bash".

## Brand facts

- Name: BACH Wears
- Founder: Bachar Elmir
- Country: Lebanon
- Website: https://bachwears.com (English) · https://bachwears.com/ar (Arabic)
- Contact: care@bachwears.com · +961 71 566 296
- Catalogue: ${productCount ?? 0} published products across ${categories.length} categories (${categories.join(", ")})
- Currencies: USD and Lebanese Pound (LBP)
- Payment: cash in store, cash on delivery; card payments (Visa/Mastercard) where enabled
- Delivery: Lebanon-wide; orders confirmed by phone before dispatch

## Key pages

- [Shop](https://bachwears.com/shop): full collection with category, size, color and price filters
- [Help Center](https://bachwears.com/help): ordering, delivery, returns and account answers
- [Support](https://bachwears.com/support): file and track a complaint ticket
- [Sitemap](https://bachwears.com/sitemap.xml)

## Policies (Help Center)

${(articles ?? []).map((a) => `- [${a.title_en}](https://bachwears.com/help/${a.slug})`).join("\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
