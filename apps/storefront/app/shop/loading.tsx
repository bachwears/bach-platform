/** Shown while the shop loads (e.g. after scrolling past The New on the home page). */
export default function ShopLoading() {
  return (
    <div className="grid min-h-[70dvh] place-items-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="h-5 w-5 animate-spin rounded-full border border-foreground/20 border-t-foreground motion-reduce:animate-none" />
        <span className="type-meta text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}
