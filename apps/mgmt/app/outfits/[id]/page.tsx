import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../../components/nav";
import { OutfitEditor } from "../../../components/outfit-editor";

const EDITORS = new Set(["super_admin", "store_manager", "marketing_manager"]);

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader icon="collections" title="طقم" description="القطع، الصور، السعر وطريقة البيع — كل قسم بينحفظ لحالو." />
        {EDITORS.has(profile?.role ?? "") ? (
          <OutfitEditor id={id} />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">الأطقم للسوبر أدمن، مدير المحل ومسؤول التسويق.</p>
        )}
      </main>
    </div>
  );
}
