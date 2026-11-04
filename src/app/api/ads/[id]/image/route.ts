import { AD_IMAGE_TYPES } from "@/game/ads";
import { readAdImage, readAdStore } from "@/server/adStore";

export const dynamic = "force-dynamic";

const typeOf = (file: string) =>
  Object.entries(AD_IMAGE_TYPES).find(([, ext]) => file.endsWith(`.${ext}`))?.[0] ?? "application/octet-stream";

/** Reklam görselini verir; kapalı ya da silinmiş reklamın görseli de verilmez. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = (await readAdStore()).ads.find((a) => a.id === id);
  if (!ad?.image) return new Response(null, { status: 404 });
  const bytes = await readAdImage(ad.image);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": typeOf(ad.image), "Cache-Control": "public, max-age=300" },
  });
}
