import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";


export const metadata = { title: "Help Center — BACH Wears" };

export default async function HelpPage() {
  const supabase = await supabaseServer();
  const { data: articles } = await supabase
    .from("help_articles")
    .select("slug, category, title_en, body_en")
    .order("sort");

  const byCategory = new Map<string, Array<{ slug: string; title_en: string }>>();
  for (const a of articles ?? []) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Help Center</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">How can we help?</h1>
        <p className="mt-2 text-muted-foreground">
          Answers to everything about ordering, delivery, and returns — or ask our assistant, bottom right.
        </p>

        <div className="mt-10 space-y-8">
          {[...byCategory.entries()].map(([category, list]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h2>
              <ul className="mt-3 divide-y rounded-md border">
                {list.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/help/${a.slug}`} className="block px-4 py-3 hover:bg-muted/50">
                      {a.title_en}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
