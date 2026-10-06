import { Button } from "@bach/ui/components/button";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { StaffManager } from "../../components/staff-manager";

// Super admin only (lib/access.ts); the staff-admin function checks again server-side.
export default function StaffPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          title="الموظفين"
          description="اعمل حساب لكل موظف بإيميلو وكلمة سر مؤقتة — أوّل مرّة بيفوت بيطلب منو البرنامج يغيّرها. الـPIN تبع الكاشير بيحطّو الموظف بنفسو من الكاشير."
          hint={{
            title: "حسابات الموظفين",
            what: "اعمل حساب دخول لكل موظف، حدّد دورو وفرعو، غيّرلو كلمة السر، أو وقّف حسابو. الدور هو يلي بيحدّد شو بيشوف وشو بيقدر يعدّل بالإدارة والكاشير.",
            source: "الحسابات بنظام الدخول، والأدوار بجدول profiles.",
            edit: "من هون بس — للسوبر أدمن.",
          }}
          actions={
            <Button asChild>
              <a href="#new-staff">+ حساب موظف جديد</a>
            </Button>
          }
        />
        <StaffManager />
      </main>
    </div>
  );
}
