import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { ErrorStatus } from "../../../components/error-status";
import { Nav } from "../../../components/nav";
import { APP_LABEL, KIND_LABEL, STATUS_LABEL, ago, deviceOf } from "../../../lib/errors";
import { fmt } from "../../../lib/time";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

interface Occurrence {
  id: number;
  created_at: string;
  url: string | null;
  message: string;
  stack: string | null;
  digest: string | null;
  user_agent: string | null;
  user_id: string | null;
  role: string | null;
  release: string | null;
  context: Record<string, unknown> | null;
}

export default async function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: g }, { data: rows }] = await Promise.all([
    supabase.from("app_error_groups").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("app_errors")
      .select("id, created_at, url, message, stack, digest, user_agent, user_id, role, release, context")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!g) notFound();
  const list = (rows ?? []) as Occurrence[];
  const who = (o: Occurrence) => (o.role ? (ROLE_LABEL[o.role] ?? o.role) : o.user_id ? "زبون مسجّل" : "زائر");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <PageHeader
          icon="errors"
          back={{ href: "/errors", label: "الأخطاء" }}
          title={`${APP_LABEL[g.app] ?? g.app} · ${KIND_LABEL[g.kind] ?? g.kind}`}
          description={`${STATUS_LABEL[g.status] ?? g.status} · ${g.count} مرّة · ${g.users} شخص · آخر مرّة ${ago(g.last_seen)}`}
        />

        <section className="space-y-4 border p-4">
          <p className="whitespace-pre-wrap break-words font-mono text-sm" dir="ltr">
            {g.message}
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">أول مرّة</dt>
              <dd dir="ltr">{fmt(g.first_seen, { dateStyle: "short", timeStyle: "short" })}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">آخر مرّة</dt>
              <dd dir="ltr">{fmt(g.last_seen, { dateStyle: "short", timeStyle: "short" })}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">آخر صفحة</dt>
              <dd className="truncate" dir="ltr">
                {g.last_url ?? "—"}
              </dd>
            </div>
          </dl>
          <ErrorStatus id={g.id} status={g.status} />
        </section>

        {g.stack ? (
          <details className="border p-4">
            <summary className="cursor-pointer text-sm">التفاصيل التقنية (stack)</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs" dir="ltr">
              {g.stack}
            </pre>
          </details>
        ) : null}

        <section className="space-y-2">
          <h2 className="font-medium">كل مرّة صار ({list.length < g.count ? `آخر ${list.length} من ${g.count}` : list.length})</h2>
          <ul className="divide-y border text-sm">
            {list.map((o) => (
              <li key={o.id} className="space-y-1 p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-mono text-xs" dir="ltr">
                    {fmt(o.created_at, { dateStyle: "short", timeStyle: "medium" })}
                  </span>
                  <span>{who(o)}</span>
                  <span className="text-muted-foreground">{deviceOf(o.user_agent)}</span>
                  {o.release ? (
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                      v {o.release.slice(0, 7)}
                    </span>
                  ) : null}
                </div>
                {o.url ? (
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {o.url}
                  </p>
                ) : null}
                {o.message !== g.message ? (
                  <p className="break-words font-mono text-xs" dir="ltr">
                    {o.message}
                  </p>
                ) : null}
                {o.context && Object.keys(o.context).length ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">تفاصيل</summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-xs" dir="ltr">
                      {JSON.stringify({ ...o.context, ...(o.digest ? { digest: o.digest } : {}) }, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
