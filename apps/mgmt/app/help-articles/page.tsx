import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
        <PageHeader
          title="تعديل مقالات المساعدة"
          description="المقالات يلّي بتبيّن بالموقع (بالإنكليزي) وبالكاشير والإدارة (بالعربي)، وبيقراها المساعد."
          hint={{
            title: "مقالات المساعدة",
            what: "كل مقالة بتشرح وظيفة وحدة. بتبيّن بس للأدوار المختارة تحت «مين بيشوفها»، والسوبر أدمن بيشوف الكل.",
            source: "جدول help_articles؛ المساعد الذكي بيجاوب من المقالات المنشورة بس.",
            edit: "من هون: عدّل النص، اختار مين بيشوفها، وانشر أو خبّي.",
          }}
          back={{ href: "/help", label: "مركز المساعدة" }}
        />
        <HelpArticlesEditor articles={(data ?? []) as HelpArticle[]} />
      </main>
    </div>
  );
}
