import Link from "next/link";

import { SiteHeader } from "../../components/site-header";

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Order placed</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Thank you{n ? ` — order #${n}` : ""}.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We&apos;ll call you shortly to confirm delivery details. Payment is in cash when your
            order arrives — keep your order number handy.
          </p>
          <div className="mt-8 space-y-4">
            <Link
              href="/account/new"
              className="inline-block rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background"
            >
              Create an account — details already filled
            </Link>
            <p className="text-xs text-muted-foreground">
              Track this order and skip the forms next time.
            </p>
            <Link href="/shop" className="inline-block text-sm underline underline-offset-4">
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
