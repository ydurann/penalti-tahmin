import { NextResponse } from "next/server";
import { removePenalty } from "@/data/manual";
import { requireAdmin } from "@/server/adminAuth";
import { readManualStore, writeManualStore } from "@/server/manualStore";

export const dynamic = "force-dynamic";

/** Elle girilen bir penaltıyı siler. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const store = await readManualStore();
  if (!store.penalties.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  await writeManualStore(removePenalty(store, id));
  return NextResponse.json({ ok: true });
}
