import { supabaseServer } from "@bach/supabase/server";

import { HintDot } from "@bach/ui/components/hint-dot";

import { Nav } from "../../components/nav";
import { RateForm } from "../../components/rate-form";

function lbp(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} ل.ل`;
}

export default async function ExchangeRatePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: history }, { data: hint }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("exchange_rates")
      .select("id, lbp_per_usd, effective_at, profiles(full_name)")
      .order("effective_at", { ascending: false })
      .limit(30),
    supabase.from("hint_registry").select("*").eq("key", "rate-current").maybeSingle(),
  ]);

  const canSet = ["super_admin", "store_manager"].includes(profile?.role ?? "");
  const rates = history ?? [];
  const latest = rates[0];
  const current = latest ? Number(latest.lbp_per_usd) : null;

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">سعر الصرف</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سعر الليرة مقابل الدولار المعتمد بكل المنصة — الكاشير، المتجر، والتقارير.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            السعر الحالي
            {hint && (
              <HintDot hint={{ title: hint.title_ar, what: hint.what_ar, source: hint.source_ar, edit: hint.edit_ar, articleHref: hint.article_slug ? `/help#${hint.article_slug}` : null }} />
            )}
          </p>
          {current != null && latest ? (
            <>
              <p className="mt-1 font-mono text-4xl font-semibold">
                {lbp(current)} <span className="text-lg text-muted-foreground">/ $</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                من {new Date(latest.effective_at).toLocaleString("en-GB")}
                {(latest.profiles as unknown as { full_name: string } | null)?.full_name
                  ? ` · حدّده ${(latest.profiles as unknown as { full_name: string }).full_name}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-lg text-destructive">ما في سعر محدّد — البيع واقف لحد ما تحدّد سعر.</p>
          )}
        </div>

        {canSet ? (
          <RateForm currentRate={current} />
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            بس السوبر أدمن ومدير المحل بيقدروا يغيّروا سعر الصرف.
          </p>
        )}

        {rates.length > 1 && (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">السعر</th>
                  <th className="p-3 font-normal">التغيير</th>
                  <th className="p-3 font-normal">من تاريخ</th>
                  <th className="p-3 font-normal">حدّده</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, idx) => {
                  const prev = rates[idx + 1];
                  const delta = prev
                    ? ((Number(r.lbp_per_usd) - Number(prev.lbp_per_usd)) / Number(prev.lbp_per_usd)) * 100
                    : null;
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 font-mono">{lbp(Number(r.lbp_per_usd))}</td>
                      <td className="p-3 font-mono" dir="ltr">
                        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                      </td>
                      <td className="p-3 text-muted-foreground" dir="ltr">
                        {new Date(r.effective_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-3">
                        {(r.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
