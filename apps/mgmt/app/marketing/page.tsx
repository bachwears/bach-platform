import { supabaseServer } from "@bach/supabase/server";

import { Marketing } from "../../components/marketing";
import { Nav } from "../../components/nav";
import { NewsletterCard } from "../../components/newsletter-card";

const MARKETING_ROLES = new Set(["super_admin", "store_manager", "marketing_manager"]);

export default async function MarketingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = MARKETING_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">التسويق</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الموسم، الحملات، أكواد الخصم، والبوب-أب — كلو من هون.
          </p>
        </div>
        {allowed ? (
          <>
            <Marketing />
            <NewsletterCard />
          </>
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة التسويق.</p>
        )}
      </main>
    </div>
  );
}
