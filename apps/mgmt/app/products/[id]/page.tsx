import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../../components/nav";
import { ColourPhotos, type ProductColour } from "../../../components/colour-photos";
import { colourCode, onSite, photoView, type MediaRow } from "../../../components/photo-tools";
import {
  BasicsFields,
  DetailsFields,
  ProductEditorProvider,
  SaveProductButton,
  SeoFields,
} from "../../../components/product-form";
import { ProductSection } from "../../../components/product-section";
import { ProductOverview, ProductStatusBar, type PhotoFacts, type SavedState } from "../../../components/product-status";
import { VariantManager, type Variant } from "../../../components/variant-manager";
import { WearWithPicker, type PairedPiece } from "../../../components/wear-with-picker";

type Level = { quantity: number; reserved: number };
const sellable = (levels: Level[] | null | undefined) => (levels ?? []).reduce((n, l) => n + l.quantity - l.reserved, 0);
const dollars = (cents: number | null | undefined) => (cents != null ? (cents / 100).toString() : "");

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: product }, { data: categories }, { data: variantRows }, { data: media }, { data: pairs }] = await Promise.all([
    supabase.from("products").select("*, product_seasons(season)").eq("id", id).single(),
    supabase.from("categories").select("id, name_ar, code").eq("is_active", true).order("sort"),
    supabase
      .from("product_variants")
      .select("id, size, color_code, color_en, color_ar, sku, barcode, is_active, inventory_levels(quantity, reserved)")
      .eq("product_id", id)
      .order("created_at"),
    // "*" keeps this working whether or not the color_en column has landed yet
    supabase.from("media_assets").select("*").eq("product_id", id),
    supabase
      .from("product_pairings")
      .select("sort, paired:products!product_pairings_paired_id_fkey(id, name_en, price_usd_cents, media_assets(kind, storage_path))")
      .eq("product_id", id)
      .order("sort"),
  ]);
  if (!product) notFound();

  const paired: PairedPiece[] = ((pairs ?? []) as unknown as Array<{
    paired: { id: string; name_en: string; price_usd_cents: number; media_assets: Array<{ kind: string; storage_path: string }> | null } | null;
  }>)
    .filter((r) => r.paired)
    .map(({ paired: p }) => ({
      id: p!.id,
      name_en: p!.name_en,
      price_usd_cents: p!.price_usd_cents,
      photo: (p!.media_assets ?? []).find((m) => m.kind === "front")?.storage_path ?? null,
    }));

  const variants: Variant[] = ((variantRows ?? []) as unknown as Array<Variant & { inventory_levels: Level[] | null }>).map(
    ({ inventory_levels, ...v }) => ({ ...v, stock: sellable(inventory_levels) }),
  );
  const photos = (media ?? []) as MediaRow[];
  const front = photos.find((m) => m.kind === "front") ?? null;
  const heroColor = front?.color_en ?? null;

  // one entry per colour the product is sold in (from its variants)
  const colourMap = new Map<string, ProductColour>();
  for (const v of variants) {
    if (!v.color_en) continue;
    const c = colourMap.get(v.color_en) ?? { en: v.color_en, ar: v.color_ar || null, code: null, active: false, stock: 0 };
    c.code ??= colourCode(v.sku);
    c.active ||= v.is_active;
    if (v.is_active) c.stock += v.stock ?? 0;
    colourMap.set(v.color_en, c);
  }
  const colours = [...colourMap.values()];
  const live = photos.filter(onSite);
  const activeColours = colours.filter((c) => c.active);

  const facts: PhotoFacts = {
    hasFront: !!front,
    hasBack:
      photos.some((m) => m.kind === "back") ||
      live.some((m) => photoView(m).view === "back" && (m.kind !== "other" || m.color_en === heroColor)),
    coloursWithoutPhotos: activeColours
      .filter((c) => !(c.en === heroColor && front) && !live.some((m) => m.color_en === c.en))
      .map((c) => c.en),
    colourCount: activeColours.length,
  };

  const activeVariants = variants.filter((v) => v.is_active);
  const saved: SavedState = {
    name: product.name_en,
    slug: product.slug,
    status: product.status,
    front: front?.storage_path ?? null,
    priceCents: product.price_usd_cents,
    saleCents: product.sale_price_usd_cents,
    stock: activeVariants.reduce((n, v) => n + (v.stock ?? 0), 0),
    activeVariants: activeVariants.length,
  };

  const seasons = ((product.product_seasons as Array<{ season: string }> | null) ?? []).map((x) => x.season);
  const detailsMissing = [
    !product.description_en && "الوصف",
    !product.material_en && "الخامة",
    !product.care_en && "العناية",
    !seasons.length && "المواسم",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 pb-24 pt-2">
        <ProductEditorProvider
          categories={categories ?? []}
          initial={{
            id: product.id,
            name_en: product.name_en,
            name_ar: product.name_ar,
            slug: product.slug,
            category_id: product.category_id,
            price_usd: dollars(product.price_usd_cents),
            sale_price_usd: dollars(product.sale_price_usd_cents),
            cost_usd: dollars(product.cost_usd_cents as number | null),
            status: product.status,
            description_en: product.description_en ?? "",
            description_ar: product.description_ar ?? "",
            fit: product.fit ?? "",
            material_en: product.material_en ?? "",
            care_en: product.care_en ?? "",
            meta_title_en: product.meta_title_en ?? "",
            meta_description_en: product.meta_description_en ?? "",
            seasons: seasons.join(","),
            tags: (product.tags as string[] | null) ?? [],
            hero: ((product.tags as string[] | null) ?? []).includes("hero"),
          }}
        >
          <ProductStatusBar saved={saved} />

          <div className="space-y-4 pt-2">
            <ProductSection id="overview" step={1} title="الحالة وشو ناقص">
              <ProductOverview saved={saved} photos={facts} />
            </ProductSection>

            <ProductSection
              id="basics"
              step={2}
              title="الأساسيات"
              summary="الاسم، الرابط، الفئة، الأسعار والحالة"
            >
              <BasicsFields />
              <SaveProductButton className="mt-5 border-t pt-4" />
            </ProductSection>

            <ProductSection
              id="photos"
              step={3}
              title="الصور حسب اللون"
              summary={`${live.length} صورة عالموقع${photos.length > live.length ? ` · ${photos.length - live.length} مخفية` : ""}${
                facts.coloursWithoutPhotos.length ? ` · ناقص صور: ${facts.coloursWithoutPhotos.join("، ")}` : ""
              }`}
              hint={{
                title: "الصور حسب اللون",
                what: "كل لون إلو صورو. الصورة الأساسية (قدّام) بتبيّن بالشوب، وبلاها المنتج مخفي. لمّا الزبون يختار لون إلو صور، صفحة المنتج بتبدّل لصور هاللون.",
                source: "جدول media_assets (اللون بعمود color_en)، والملفات بـ product-media. نوع الصورة (قدّام، لابس…) مكتوب باسم الملف والموقع بيقراه من هونيك.",
                edit: "من هون: زيد صور لكل لون، أو اكبس على صورة لتغيّر نوعها أو لونها، تبدّل الملف، تخبّيها، تنقلها لمنتج تاني أو تمحيها. للتنزيل بالجملة: صفحة «الصور». بيبيّن عالموقع خلال دقيقة أو دقيقتين.",
              }}
            >
              <ColourPhotos productId={product.id} photos={photos} colours={colours} />
            </ProductSection>

            <ProductSection
              id="variants"
              step={4}
              title="الألوان والمقاسات"
              summary={`${colours.length} ألوان · ${variants.length} فاريانت · ستوك ${saved.stock}`}
              hint={{
                title: "الألوان والمقاسات",
                what: "كل مقاس بكل لون = فاريانت إلو SKU وباركود. الزبون بيختار من الفاريانتس الفعّالة بس.",
                source: "جدول product_variants. الستوك من inventory_levels (الكمية ناقص المحجوز) بكل الفروع.",
                edit: "زيد لون أو مقاسات من الفورم تحت، ووقّف/فعّل أي مقاس. الستوك بيتعدّل من «المخزون».",
              }}
            >
              <VariantManager productId={product.id} variants={variants} />
            </ProductSection>

            <ProductSection
              id="details"
              step={5}
              title="التفاصيل"
              summary={detailsMissing.length ? `ناقص: ${detailsMissing.join("، ")}` : "الوصف، القَصّة، الخامة، العناية والمواسم"}
            >
              <DetailsFields />
              <SaveProductButton className="mt-5 border-t pt-4" />
            </ProductSection>

            <ProductSection
              id="wear-with"
              step={6}
              title="البسها مع (Wear with)"
              summary={paired.length ? `${paired.length} من 4 قطع` : "ما في اختيارات — الموقع بيفرجي «Complete the look»"}
              hint={{
                title: "البسها مع",
                what: "٢ لـ ٤ قطع منبيعها بتطلع تحت صور هالمنتج بالموقع، كل وحدة بكبسة + للإضافة السريعة. أحسن شي القطع يلّي الموديل لابسها بالصور (بنطلون، شوز…) إذا موجودين عنّا.",
                source: "جدول product_pairings. إذا ما في اختيارات، الموقع بيفرجي «Complete the look» من نفس الكولكشن.",
                edit: "من هون: دوّر عالقطعة بالاسم وزيدها، رتّبها بالأسهم، أو شيلها. بيبيّن عالموقع فوراً.",
              }}
            >
              <WearWithPicker productId={product.id} initial={paired} />
            </ProductSection>

            <ProductSection
              id="seo"
              step={7}
              title="Google (SEO)"
              summary={product.meta_title_en || product.meta_description_en ? "عنوان ووصف مخصّصين" : "تلقائي من الاسم والوصف"}
              defaultOpen={false}
            >
              <SeoFields />
              <SaveProductButton className="mt-5 border-t pt-4" />
            </ProductSection>
          </div>
        </ProductEditorProvider>
      </main>
    </div>
  );
}
