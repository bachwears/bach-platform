import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

import { ComplaintsQueue } from "../../components/complaints-queue";
import { Nav } from "../../components/nav";

const QUEUE_ROLES = new Set(["super_admin", "store_manager", "support_agent"]);

export default async function ComplaintsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = QUEUE_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          icon="complaints"
          title="الشكاوى"
          description="كل تذكرة بيفتحها زبون من الموقع بتوصل لهون — عيّنها إلك، علّق، ردّ عالزبون، وسكّرها."
          hint={{
            title: "طابور الشكاوى",
            what: "كل شكوى إلها رقم وحالة. «ظاهر للزبون» بيبعت الرد للزبون بصفحة تتبّع الشكوى؛ بلاه بتضل ملاحظة داخلية.",
            source: "الشكاوى من نموذج الدعم عالموقع (complaints) وسجلها (complaint_events).",
            edit: "من هون: التعيين، الملاحظات والحالة. للسوبر أدمن، مدير المحل وخدمة الزبائن.",
          }}
        />
        {allowed ? (
          <ComplaintsQueue myId={user!.id} />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">دورك ما بيسمح بإدارة الشكاوى — إذا لازمك، احكي السوبر أدمن.</p>
        )}
      </main>
    </div>
  );
}
