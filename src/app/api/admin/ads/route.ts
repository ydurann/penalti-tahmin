import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AD_IMAGE_MAX_BYTES, AD_IMAGE_TYPES, addAd, validateAdText, type Ad, type AdStore } from "@/game/ads";
import { requireAdmin } from "@/server/adminAuth";
import { readAdStore, saveAdImage, updateAdStore } from "@/server/adStore";

export const dynamic = "force-dynamic";

/** Tüm reklamlar (kapalılar dahil); yönetim listesi. */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json<AdStore>(await readAdStore());
}

/** Yeni reklam: `multipart/form-data` ile `text` ve isteğe bağlı `image` dosyası. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const image = form.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  const result = validateAdText(form.get("text"), file !== null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  let fileName: string | null = null;
  const id = randomUUID();
  if (file) {
    const ext = AD_IMAGE_TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Görsel PNG, JPEG, WebP, GIF ya da SVG olmalı." }, { status: 400 });
    if (file.size > AD_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: `Görsel en çok ${AD_IMAGE_MAX_BYTES / 1024 / 1024} MB olabilir.` }, { status: 400 });
    }
    fileName = `${id}.${ext}`;
    await saveAdImage(fileName, new Uint8Array(await file.arrayBuffer()));
  }

  const ad: Ad = { id, text: result.text, image: fileName, enabled: true, createdAt: Date.now() };
  const store = await updateAdStore((s) => addAd(s, ad));
  return NextResponse.json<AdStore>(store, { status: 201 });
}
