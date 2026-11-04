import { NextResponse } from "next/server";
import { moveAd, removeAd, updateAd, validateAdText, type AdStore } from "@/game/ads";
import { requireAdmin } from "@/server/adminAuth";
import { deleteAdImage, readAdStore, updateAdStore } from "@/server/adStore";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Açık/kapalı durumu, yazıyı ya da sırayı değiştirir: `{ enabled?, text?, move?: -1 | 1 }`. */
export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { enabled?: unknown; text?: unknown; move?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const current = (await readAdStore()).ads.find((a) => a.id === id);
  if (!current) return NextResponse.json({ error: "Reklam bulunamadı." }, { status: 404 });

  const change: { enabled?: boolean; text?: string } = {};
  if (typeof body.enabled === "boolean") change.enabled = body.enabled;
  if (body.text !== undefined) {
    const result = validateAdText(body.text, current.image !== null);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    change.text = result.text;
  }
  const move = body.move === -1 || body.move === 1 ? body.move : null;

  const store = await updateAdStore((s) => {
    const updated = updateAd(s, id, change);
    return move ? moveAd(updated, id, move) : updated;
  });
  return NextResponse.json<AdStore>(store);
}

/** Reklamı ve görselini siler. */
export async function DELETE(request: Request, { params }: Params) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const current = (await readAdStore()).ads.find((a) => a.id === id);
  if (!current) return NextResponse.json({ error: "Reklam bulunamadı." }, { status: 404 });
  const store = await updateAdStore((s) => removeAd(s, id));
  if (current.image) await deleteAdImage(current.image);
  return NextResponse.json<AdStore>(store);
}
