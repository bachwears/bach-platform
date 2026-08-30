import { Button } from "@bach/ui/components/button";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center gap-4">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">BACH Wears</h1>
        <p className="text-muted-foreground">Storefront foundation — theme pipeline live.</p>
        <div className="flex gap-3">
          <Button>Shop now</Button>
          <Button variant="outline">Collections</Button>
        </div>
      </div>
    </main>
  );
}
