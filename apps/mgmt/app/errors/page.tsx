import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { EmptyState } from "@bach/ui/components/empty-state";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { APP_LABEL, KIND_LABEL, STATUS_LABEL, ago } from "../../lib/errors";
import { fmt } from "../../lib/time";

const STATUSES = ["open", "resolved", "ignored"] as const;
const APPS = ["", "storefront", "pos", "mgmt", "server"] as const;

interface Group {
  id: string;
  app: string;
  kind: string;
  message: string;
  last_url: string | null;
  count: number;
  users: number;
  status: string;
  first_seen: string;
  last_seen: string;
}

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ status?: string; app?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "open";
  const app = APPS.includes(sp.app as (typeof APPS)[number]) ? (sp.app ?? "") : "";
  const q = (sp.q ?? "").trim();
  const supabase = await supabaseServer();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  let query = supabase
    .from("app_error_groups")
    .select("id, app, kind, message, last_url, count, users, status, first_seen, last_seen")
    .eq("status", status)
    .order("last_seen", { ascending: false })
    .limit(300);
  if (app) query = query.eq("app", app);
  if (q) query = query.ilike("message", `%${q.replace(/[%_\\]/g, " ")}%`);

  const [{ data, error }, { count: openCount }, { count: newToday }, { count: hits24 }] = await Promise.all([
    query,
    supabase.from("app_error_groups").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("app_error_groups").select("id", { count: "exact", head: true }).gte("first_seen", since),
    supabase.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  const groups = (data ?? []) as Group[];

  const link = (p: Record<string, string>) => {
    const u = new URLSearchParams({ status, ...(app ? { app } : {}), ...(q ? { q } : {}), ...p });
    for (const [k, v] of [...u]) if (!v) u.delete(k);
    return `/errors?${u}`;
  };
  const tab = (active: boolean) =>
    `-mb-px border-b pb-2 ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          icon="errors"
          title="الأخطاء"
          description="كل خطأ بيصير بالموقع، الـPOS والإدارة — متجمّع حسب نوعو، مع كل مرة صار فيها."
          hint={{
            title: "تتبّع الأخطاء",
            what: "كل مرة بتوقع صفحة، أو بيفشل حفظ أو طلب بالداتابيز، أو بيصير خطأ بالسيرفر، بينسجّل هون أوتوماتيك. نفس الخطأ بيتجمّع بسطر واحد مع عدد المرات وكم شخص صادفو.",
            source: "من صفحات الزباين والموظفين (المتصفح) ومن السيرفر. ما منسجّل كلمات سر ولا شي بعد «?» بالرابط. خطأ جديد بيبعتلك إيميل (أكتر شي مرة كل 6 ساعات لنفس الخطأ).",
            edit: "افتح الخطأ لتشوف كل مرة صار فيها. «انحلّ» بعد التصليح — إذا رجع بيرجع ينفتح وبيوصلك إيميل. «تجاهل» للأخطاء العادية يلي ما بدّك تنبيه عنها.",
          }}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">أخطاء مفتوحة</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{openCount ?? 0}</p>
          </div>
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">أنواع جديدة (آخر 24 ساعة)</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{newToday ?? 0}</p>
          </div>
          <div className="border p-4">
            <p className="text-sm text-muted-foreground">مرّات (آخر 24 ساعة)</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{hits24 ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-b text-sm">
          <div className="flex gap-5" aria-label="الحالة">
            {STATUSES.map((s) => (
              <Link key={s} href={link({ status: s })} aria-current={status === s ? "page" : undefined} className={tab(status === s)}>
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </div>
          <div className="flex gap-4" aria-label="التطبيق">
            {APPS.map((a) => (
              <Link key={a} href={link({ app: a })} aria-current={app === a ? "page" : undefined} className={tab(app === a)}>
                {a ? APP_LABEL[a] : "الكل"}
              </Link>
            ))}
          </div>
        </div>

        <form action="/errors" className="flex flex-wrap gap-2">
          <input type="hidden" name="status" value={status} />
          {app ? <input type="hidden" name="app" value={app} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="دوّر بنص الخطأ…"
            aria-label="دوّر بنص الخطأ"
            className="h-10 min-w-0 flex-1 border bg-background px-3 text-sm sm:max-w-sm"
            dir="auto"
          />
          <button type="submit" className="h-10 border px-4 text-sm hover:bg-muted">
            دوّر
          </button>
        </form>

        {error ? (
          <p className="text-sm text-destructive">ما قدرنا نجيب الأخطاء: {error.message}</p>
        ) : groups.length === 0 ? (
          <div className="border">
            <EmptyState icon="errors" title={status === "open" ? "ما في أخطاء مفتوحة — كل شي ماشي." : "ما في شي هون."} />
          </div>
        ) : (
          <ul className="divide-y border">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/errors/${g.id}`} className="grid gap-2 p-4 hover:bg-muted/50 sm:grid-cols-[1fr_auto]">
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="border px-1.5">{APP_LABEL[g.app] ?? g.app}</span>
                      <span>{KIND_LABEL[g.kind] ?? g.kind}</span>
                      {g.last_url ? (
                        <span className="truncate" dir="ltr">
                          {g.last_url.replace(/^https?:\/\//, "")}
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 block font-mono text-sm" dir="ltr">
                      {g.message}
                    </span>
                  </span>
                  <span className="flex items-center gap-5 text-sm sm:justify-end">
                    <span className="text-center">
                      <span className="block font-mono text-lg">{g.count}</span>
                      <span className="text-xs text-muted-foreground">مرّة</span>
                    </span>
                    <span className="text-center">
                      <span className="block font-mono text-lg">{g.users}</span>
                      <span className="text-xs text-muted-foreground">مسجّل</span>
                    </span>
                    <span className="text-xs text-muted-foreground" title={fmt(g.last_seen)}>
                      آخر مرّة: {ago(g.last_seen)}
                      <span className="block">أول مرّة: {fmt(g.first_seen, { dateStyle: "short" })}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
