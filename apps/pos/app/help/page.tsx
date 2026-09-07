import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";



export default async function HelpPage() {
  const supabase = await supabaseServer();
  const { data: articles } = await supabase
    .from("help_articles")
    .select("slug, category, title_ar, body_ar")
    .order("sort");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <Link href="/" className="flex items-center gap-2"><img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" /><span className="text-sm font-semibold text-muted-foreground">POS</span></Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← رجوع للكاشير</Link>
      </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">مركز المساعدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل شي بيخص شغلك، حسب دورك — المقالات يلي شايفها هي المسموحة إلك.
          </p>
        </div>
        <div className="space-y-4">
          {(articles ?? []).map((a) => (
            <details key={a.slug} className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">{a.title_ar}</summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{a.body_ar}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
