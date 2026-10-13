import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { OutfitsList } from "../../components/outfits-list";

const EDITORS = new Set(["super_admin", "store_manager", "marketing_manager"]);

export default async function OutfitsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <PageHeader
          icon="collections"
          title="الأطقم"
          description="لوكات كاملة من قطع موجودة — إلها صفحة وصور وسعر خاص، والقطع بتنباع من المخزون تبعها."
          hint={{
            title: "الأطقم",
            what: "الطقم = قطعتين أو أكتر من القطع الموجودة. ما إلو ستوك لحالو: لمّا ينباع، كل قطعة بتنقص من مخزونها وبتطلع عالفاتورة لحالها مع حصّتها من الخصم.",
            source: "جداول outfits و outfit_items و outfit_media. السعر بينحسب بالسيرفر بنفس الطريقة للموقع والكاشير.",
            edit: "من هون: «طقم جديد» أو كبسة على أي طقم لتعدّلو.",
          }}
        />
        {EDITORS.has(profile?.role ?? "") ? (
          <OutfitsList />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">الأطقم للسوبر أدمن، مدير المحل ومسؤول التسويق.</p>
        )}
      </main>
    </div>
  );
}
