// The version this server runs (baked at build), polled by <FreshApp /> to offer a reload.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ v: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
