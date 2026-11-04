import { ADSENSE_PUB_ID, adsenseEnabled } from "@/lib/adsense";

/**
 * AdSense'in istediği `ads.txt`: yayıncı kimliği ortam değişkeninden üretilir, böylece
 * elle dosya tutulmaz. Kimlik yoksa boş yorumlu dosya döner (404 yerine; Google tarar).
 */
export function GET() {
  const body = adsenseEnabled()
    ? `google.com, ${ADSENSE_PUB_ID}, DIRECT, f08c47fec0942fa0\n`
    : "# AdSense yapılandırılmadı (NEXT_PUBLIC_ADSENSE_CLIENT)\n";
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}
