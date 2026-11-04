import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Yönetim uçları `ADMIN_SECRET` ortam değişkeniyle korunur; istemci anahtarı
 * `x-admin-key` başlığında gönderir. Değişken tanımlı değilse yönetim tamamen kapalıdır.
 */
export const ADMIN_HEADER = "x-admin-key";

function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Yetki yoksa hata yanıtı, varsa null döner. */
export function requireAdmin(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Yönetim kapalı: sunucuda ADMIN_SECRET tanımlı değil." },
      { status: 503 },
    );
  }
  const given = request.headers.get(ADMIN_HEADER) ?? "";
  if (!given || !secretMatches(given, expected)) {
    return NextResponse.json({ error: "Yönetim anahtarı geçersiz." }, { status: 401 });
  }
  return null;
}
