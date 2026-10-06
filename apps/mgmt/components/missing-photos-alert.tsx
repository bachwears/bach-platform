import Link from "next/link";
import { ImageOff } from "lucide-react";
import { supabaseServer } from "@bach/supabase/server";

/**
 * Published products without a front photo are hidden from the storefront
 * (shop, search, home, sitemap). This banner keeps that backlog visible in
 * MGMT until every one of them is photographed.
 */
export async function MissingPhotosAlert({ className = "" }: { className?: string }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("products").select("id, media_assets(kind)").eq("status", "published");
  const hidden = (data ?? []).filter(
    (p) => !((p.media_assets as unknown as Array<{ kind: string }>) ?? []).some((m) => m.kind === "front"),
  ).length;
  if (!hidden) return null;

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border border-red-500/40 bg-red-500/10 p-4 text-sm ${className}`}
    >
      <ImageOff className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-red-700 dark:text-red-300">
          {hidden} منتج منشور مخفي عن الموقع لأنو ما إلن صور
        </p>
        <p className="mt-0.5 text-muted-foreground">
          الزبون ما بيشوفن بالشوب ولا بالبحث ولا بالصفحة الرئيسية. بس تنزّل الصورة الأمامية لأي منتج، بيطلع عالموقع لحالو.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/products?f=no-photos"
          className="bg-foreground px-4 py-2 font-medium text-background hover:bg-foreground/85"
        >
          شوف القطع المخفية
        </Link>
        <Link href="/media-import" className="border px-4 py-2 font-medium hover:bg-muted">
          نزّل صور
        </Link>
      </div>
    </div>
  );
}
