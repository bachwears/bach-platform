import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";


export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: article } = await supabase
    .from("help_articles")
    .select("title_en, title_ar, body_en, body_ar, category")
    .eq("slug", slug)
    .maybeSingle();
  if (!article) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground">
          ← Help Center
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">{article.category}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{article.title_en}</h1>
        <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{article.body_en}</p>

        <div className="mt-10 border-t pt-6" dir="rtl" lang="ar">
          <h2 className="text-xl font-semibold tracking-tight">{article.title_ar}</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{article.body_ar}</p>
        </div>
      </main>
    </div>
  );
}
