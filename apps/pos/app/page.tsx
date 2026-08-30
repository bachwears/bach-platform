import { Button } from "@bach/ui/components/button";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">‏BACH POS</h1>
        <p className="text-muted-foreground">أساس النظام جاهز — الثيم شغّال.</p>
        <Button>ابدأ البيع</Button>
      </div>
    </main>
  );
}
