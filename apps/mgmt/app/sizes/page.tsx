import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { PageHeader } from "@bach/ui/components/page-header";
import { SizeExpansion } from "../../components/size-expansion";

const SIZE_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function SizesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: branch }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          title="المقاسات"
          description="القطع يلّي إجت بمقاس واحد (OS) — وزّع مخزون كل موديل على مقاساته الحقيقية متل ما هي عالرف. الباركود القديم بيضل شغّال عالكاشير."
          hint={{
            title: "توسيع المقاسات",
            what: "المنتجات المستوردة إجت بمقاس واحد (OS) — هون بتحوّلها لمقاسات حقيقية (S/M/L…) دفعة وحدة.",
            source: "كل مقاس جديد بياخد SKU وباركود خاص فيه تلقائيًا.",
            edit: "اختار المنتج، حدد المقاسات الموجودة عندك فعليًا بالمحل، واكبس توسيع.",
          }}
        />
        {!SIZE_ROLES.has(profile?.role ?? "") ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بإدارة المقاسات — اطلب من مدير المحل أو مسؤول المخزون.
          </p>
        ) : !branch ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في فرع فعّال — لازم يكون في فرع واحد عالأقل قبل توزيع المخزون.
          </p>
        ) : (
          <SizeExpansion branchId={branch.id} />
        )}
      </main>
    </div>
  );
}
