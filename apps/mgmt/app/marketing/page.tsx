import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { LoyaltySettings } from "../../components/loyalty-settings";
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
        <PageHeader
          icon="campaigns"
          title="الحملات والعروض"
          description="الموسم، الحملات، أكواد الخصم، البوب-أب، برنامج النقاط والنشرة البريدية — كلو من هون."
        />
        {allowed ? (
          <>
            <Marketing />
            <LoyaltySettings />
            <NewsletterCard />
          </>
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بإدارة التسويق — اطلب من مدير المحل أو مسؤول التسويق.
          </p>
        )}
      </main>
    </div>
  );
}
