import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabasePublic } from "@bach/supabase/public";

import { OutfitView } from "../../../components/outfit-view";
import { getOutfit, lookPhoto, lookPrice } from "../../../lib/outfits";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await getOutfit((await params).slug);
  if (!o) return { title: "Outfit — BACH Wears" };
  const pieces = (o.outfit_items ?? []).map((i) => i.products?.name_en).filter(Boolean).join(", ");
  const description = o.meta_description_en || o.description_en || `The full look: ${pieces}.`;
  const photo = lookPhoto(o);
  return {
    title: o.meta_title_en || `${o.name_en} — BACH Wears`,
    description,
    alternates: { canonical: `/outfits/${o.slug}` },
    openGraph: { title: o.name_en, description, url: `https://bachwears.com/outfits/${o.slug}`, images: photo ? [{ url: photo }] : [] },
  };
}

export default async function OutfitPage({ params }: Props) {
  const o = await getOutfit((await params).slug);
  if (!o) notFound();
  const { data: colourRows } = await supabasePublic().from("colours").select("name_en, hex, hex2");
  const colourFills: Record<string, string> = {};
  for (const c of (colourRows ?? []) as Array<{ name_en: string; hex: string | null; hex2: string | null }>) {
    if (c.hex) colourFills[c.name_en.toLowerCase()] = c.hex2 ? `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)` : c.hex;
  }
  const price = lookPrice(o);
  const pieces = (o.outfit_items ?? []).filter((i) => i.products);
  // Google: the look as a list of its products, with the look's price
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: o.name_en,
    url: `https://bachwears.com/outfits/${o.slug}`,
    numberOfItems: pieces.length,
    itemListElement: pieces.map((i, k) => ({
      "@type": "ListItem",
      position: k + 1,
      url: `https://bachwears.com/products/${i.products!.slug}`,
      name: i.products!.name_en,
    })),
    offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: (price.pay / 100).toFixed(2), offerCount: 1 },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <OutfitView
        colourFills={colourFills}
        outfit={{
          id: o.id,
          slug: o.slug,
          name_en: o.name_en,
          description_en: o.description_en,
          price_kind: o.price_kind,
          percent_off: o.percent_off,
          fixed_usd_cents: o.fixed_usd_cents,
          sell_mode: o.sell_mode,
          photos: (o.outfit_media ?? []).map((m) => m.storage_path),
          pieces: pieces.map((i) => ({ default_color_code: i.default_color_code, product: i.products })),
        }}
      />
    </>
  );
}
