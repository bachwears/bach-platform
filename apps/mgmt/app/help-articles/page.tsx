import { supabaseServer } from "@bach/supabase/server";

import { HelpArticlesEditor, type HelpArticle } from "../../components/help-articles-editor";
import { Nav } from "../../components/nav";

/** Help Center editor: every article, published or not, for the content roles. */
export default async function HelpArticlesPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("help_articles")
    .select("id, slug, category, sort, audiences, is_published, title_ar, body_ar, title_en, body_en")
    .order("sort");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">تعديل مقالات المساعدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            المقالات يلّي بتبيّن بالموقع (بالإنكليزي) وبالكاشير والإدارة (بالعربي)، وبيقراها المساعد. كل مقالة بتبيّن بس للي مختارين تحت «مين بيشوفها».
          </p>
        </div>
        <HelpArticlesEditor articles={(data ?? []) as HelpArticle[]} />
      </main>
    </div>
  );
}
