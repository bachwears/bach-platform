import { PageHeader } from "@bach/ui/components/page-header";
import { StaffHelp } from "@bach/ui/components/staff-help";

import { Nav } from "../../components/nav";

export default async function HelpPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <PageHeader
          icon="help"
          title="مركز المساعدة"
          description="شرح كل شي بيخص شغلك، حسب دورك — المقالات يلي شايفها هي المسموحة إلك."
        />
        <StaffHelp />
      </main>
    </div>
  );
}
