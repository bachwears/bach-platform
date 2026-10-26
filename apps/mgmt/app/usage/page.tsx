import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { fmt } from "../../lib/time";

interface Metric {
  metric: string;
  label: string;
  unit: string;
  kind: "sum" | "live";
  monthly_limit: number;
  used: number;
  projected: number;
}
interface Summary {
  cycle_start: string;
  cycle_end: string;
  data_from: string | null;
  last_run_at: string | null;
  metrics: Metric[];
  daily: Array<{ day: string; gb: number; visitors: number | null }>;
}

const num = (v: number, unit: string) =>
  unit === "GB" ? `${v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US")} GB` : `${Math.round(v).toLocaleString("en-US")}`;
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function UsagePage() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("platform_usage_summary");
  const s = data as Summary | null;
  const maxGb = Math.max(1, ...(s?.daily ?? []).map((d) => Number(d.gb)));
  const daysLeft = s ? Math.max(0, Math.round((new Date(`${s.cycle_end}T00:00:00Z`).getTime() - Date.now()) / 86_400_000)) : 0;
  // photo traffic swings a lot (one viral day, a heavy upload): forecast it at
  // yesterday's rate — how the site behaves now — not the cycle's average
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (s?.daily ?? []).filter((d) => d.day < today).at(-1);
  const forecast = (m: Metric) =>
    m.metric === "cached_egress_gb" && yesterday ? Number(m.used) + Number(yesterday.gb) * daysLeft : Number(m.projected);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <PageHeader
          icon="analytics"
          title="حدود Supabase"
          description="قديش استهلكنا هالشهر من حدود خطة Supabase (Pro) — الصور، الملفات، الداتابيز والزباين."
          hint={{
            title: "متتبّع الحدود",
            what: "كل حدّ بالخطة مع شو استعملنا منو بهالدورة، وبأي سرعة عم نمشي لآخر الدورة. بيوصلك إيميل لمّا حدّ يقطع 70٪ أو 90٪ أو 100٪، أو إذا السرعة بتقول رح نطلع فوقو، أو إذا تحميل الصور بنهار صار 3 أضعاف العادة.",
            source: "تحميل الصور والـEdge Functions من سجلّات Supabase (بيتحدّثو كل ساعة). حجم الداتابيز والملفات والزباين بينقاسو من الداتابيز نفسها هلّق. Supabase ما بيعطي أرقام الفاتورة مباشرة، فالأرقام تقريبية بس قريبة كتير.",
            edit: "الحدود بجدول platform_limits. الدفع الزايد شغّال (Spend cap مطفي) فما في توقيف إذا طلعنا فوق — بس في كلفة.",
          }}
        />

        {error || !s ? (
          <p className="text-sm text-destructive">ما قدرنا نجيب الأرقام: {error?.message ?? "—"}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              الدورة:{" "}
              <span dir="ltr">
                {day(s.cycle_start)} → {day(s.cycle_end)}
              </span>{" "}
              · باقي {daysLeft} يوم
              {s.last_run_at ? (
                <>
                  {" "}
                  · آخر تحديث <span dir="ltr">{fmt(s.last_run_at, { timeStyle: "short", dateStyle: "short" })}</span>
                </>
              ) : (
                " · لسّا ما صار أول تحديث"
              )}
            </p>
            {s.data_from && s.data_from > s.cycle_start ? (
              <p className="border p-3 text-xs text-muted-foreground">
                أرقام الصور بهالدورة من <span dir="ltr">{day(s.data_from)}</span> بس — سجلّات Supabase بتنحفظ 7 أيام، فالأيام قبلها ناقصين. من الدورة الجاية الأرقام كاملة.
              </p>
            ) : null}

            <ul className="grid gap-4 sm:grid-cols-2">
              {s.metrics.map((m) => {
                const pct = (Number(m.used) / Number(m.monthly_limit)) * 100;
                const projected = forecast(m);
                const pace = m.kind === "sum" ? (projected / Number(m.monthly_limit)) * 100 : null;
                const over = pct >= 100;
                const warn = pct >= 70 || (pace ?? 0) > 100;
                return (
                  <li key={m.metric} className={`space-y-3 border p-4 ${over ? "border-destructive" : ""}`}>
                    <p className="text-sm">{m.label}</p>
                    <p className="font-mono text-2xl font-semibold" dir="ltr">
                      {num(Number(m.used), m.unit)}
                      <span className="text-sm font-normal text-muted-foreground"> / {num(Number(m.monthly_limit), m.unit)}</span>
                    </p>
                    <div className="h-2 w-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                      <div className={`h-full ${over || warn ? "bg-destructive" : "bg-foreground"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className={`text-xs ${over || warn ? "text-destructive" : "text-muted-foreground"}`}>
                      {Math.round(pct)}٪ من الحدّ
                      {pace != null
                        ? ` · ${m.metric === "cached_egress_gb" && yesterday ? "بسرعة مبارح" : "بهالسرعة"} لآخر الدورة: ${num(projected, m.unit)} (${Math.round(pace)}٪)`
                        : " · منقاس هلّق"}
                    </p>
                  </li>
                );
              })}
            </ul>

            <section className="space-y-3">
              <h2 className="font-medium">تحميل الصور كل يوم (GB)</h2>
              {s.daily.length ? (
                <div className="flex h-48 items-end gap-1 border p-3" dir="ltr">
                  {s.daily.map((d) => (
                    <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${day(d.day)}: ${Number(d.gb).toFixed(1)} GB · ${d.visitors ?? "—"} visitors`}>
                      <span className="text-[10px] text-muted-foreground">{Number(d.gb) >= 10 ? Math.round(Number(d.gb)) : Number(d.gb).toFixed(1)}</span>
                      <div className="w-full bg-foreground" style={{ height: `${Math.max(2, (Number(d.gb) / maxGb) * 140)}px` }} />
                      <span className="text-[10px] text-muted-foreground">{day(d.day).split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border p-6 text-center text-sm text-muted-foreground">لسّا ما في أرقام — بتبلّش تبيّن بعد أول تحديث.</p>
              )}
              <p className="text-xs text-muted-foreground">
                المعدّل الطبيعي هلّق حوالي 7–10 GB باليوم. نهار بيطلع 3 أضعاف هالمعدّل بيبعتلك إيميل أوتوماتيك.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
