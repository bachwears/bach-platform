import { PageHeader } from "@bach/ui/components/page-header";
import { StaffHelp } from "@bach/ui/components/staff-help";

import { PosNav } from "../../components/pos-nav";

export default async function HelpPage() {
  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={null} />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        <PageHeader
          title="مركز المساعدة"
          description="كل شي بيخص شغلك، حسب دورك — المقالات يلي شايفها هي المسموحة إلك. ما لقيت جوابك؟ اسأل مساعد BACH من الزر الدائري بزاوية الشاشة."
        />
        <StaffHelp />
      </main>
    </div>
  );
}
