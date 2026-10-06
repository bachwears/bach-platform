import { StaffHelp } from "@bach/ui/components/staff-help";
import { PosNav } from "../../components/pos-nav";



export default async function HelpPage() {
  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={null} />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">مركز المساعدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل شي بيخص شغلك، حسب دورك — المقالات يلي شايفها هي المسموحة إلك.
          </p>
        </div>
        <StaffHelp />
      </main>
    </div>
  );
}
