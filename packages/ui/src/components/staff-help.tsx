import { supabaseServer } from "@bach/supabase/server";

const CATEGORY_AR: Record<string, string> = {
  Staff: "عام للموظفين",
  POS: "الكاشير",
  Management: "الإدارة",
};

interface Article {
  slug: string;
  category: string;
  title_ar: string;
  body_ar: string;
  audiences: string[];
}

/**
 * The staff help centre (POS and MGMT): the signed-in role sees its own articles
 * (plus "all staff" ones); the super admin sees every staff article. Customer
 * articles sit apart in a closed section, for answering customers. The database
 * already hides what a role may not read; this also drops what isn't theirs to
 * act on (content editors can read everything in order to edit it).
 */
export async function StaffHelp() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle(),
    supabase.from("help_articles").select("slug, category, title_ar, body_ar, audiences").order("sort"),
  ]);
  const role = (profile?.role as string | undefined) ?? "";
  const rows = (data ?? []) as Article[];
  const isStaffArticle = (a: Article) => a.audiences.some((x) => x !== "customer");
  const mine = rows.filter((a) =>
    role === "super_admin" ? isStaffArticle(a) : a.audiences.includes(role) || a.audiences.includes("all_staff"),
  );
  const customer = rows.filter((a) => a.audiences.includes("customer") && !mine.includes(a));
  const groups = [...new Set(mine.map((a) => a.category))];

  const item = (a: Article) => (
    <details key={a.slug} id={a.slug} className="scroll-mt-24 rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">{a.title_ar}</summary>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{a.body_ar}</p>
    </details>
  );

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{CATEGORY_AR[g] ?? g}</h2>
          {mine.filter((a) => a.category === g).map(item)}
        </section>
      ))}
      {mine.length === 0 && <p className="text-sm text-muted-foreground">ما في مقالات لدورك بعد.</p>}
      {customer.length > 0 && (
        <details className="rounded-lg border border-dashed p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            مقالات الزبائن ({customer.length}) — لتجاوب الزبون بنفس المعلومات يلي عالموقع
          </summary>
          <div className="mt-4 space-y-3">{customer.map(item)}</div>
        </details>
      )}
    </div>
  );
}
