import type { Metadata } from "next";

import { OutfitCard } from "../../components/outfit-card";
import { getOutfitCatalog, isListable } from "../../lib/outfits";

export const metadata: Metadata = {
  title: "Outfits — BACH Wears",
  description: "Complete looks put together by BACH — take the full look and save.",
  alternates: { canonical: "/outfits" },
};

export default async function OutfitsPage() {
  const looks = (await getOutfitCatalog()).filter(isListable);
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-8">
      <h1 className="type-display text-[34px] sm:text-5xl">Outfits</h1>
      <p className="type-meta mt-3 text-muted-foreground">Complete looks — take the full look and save.</p>
      {looks.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
          {looks.map((o, i) => (
            <OutfitCard key={o.id} outfit={o} priority={i < 4} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">New looks are on their way.</p>
      )}
    </main>
  );
}
