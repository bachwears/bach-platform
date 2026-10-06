import { HintDot } from "@bach/ui/components/hint-dot";

import { Nav } from "../../components/nav";
import { StaffManager } from "../../components/staff-manager";

// Super admin only (lib/access.ts); the staff-admin function checks again server-side.
export default function StaffPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            الموظفين
            <HintDot
              hint={{
                title: "حسابات الموظفين",
                what: "اعمل حساب دخول لكل موظف، حدّد دورو وفرعو، غيّرلو كلمة السر، أو وقّف حسابو. الدور هو يلي بيحدّد شو بيشوف وشو بيقدر يعدّل بالإدارة والكاشير.",
                source: "الحسابات بنظام الدخول، والأدوار بجدول profiles.",
                edit: "من هون بس — للسوبر أدمن.",
              }}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل موظف بيفوت بإيميلو وكلمة سر مؤقتة، وأوّل مرّة بيطلب منو البرنامج يغيّرها. الـPIN تبع الكاشير
            بيحطّو الموظف بنفسو من الكاشير.
          </p>
        </div>
        <StaffManager />
      </main>
    </div>
  );
}
