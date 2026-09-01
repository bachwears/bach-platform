import { supabaseServer } from "@bach/supabase/server";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">الشكاوى</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل تذكرة من البورتال بتوصل لهون — عيّن، علّق، ردّ عالزبون، وسكّرها.
          </p>
        </div>
        {allowed ? (
          <ComplaintsQueue myId={user!.id} />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة الشكاوى.</p>
        )}
      </main>
    </div>
  );
}
