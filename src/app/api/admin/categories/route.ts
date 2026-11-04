import { NextResponse } from "next/server";
import { addCategory, removeCategory, validateCategory } from "@/data/manual";
import { requireAdmin } from "@/server/adminAuth";
import { readManualStore, writeManualStore } from "@/server/manualStore";

export const dynamic = "force-dynamic";

/** Yeni kategori (turnuva + sezon) ekler. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body: unknown = await request.json().catch(() => null);
  const result = validateCategory(body);
  if (!result.ok) return NextResponse.json({ error: result.errors.join(" ") }, { status: 400 });
  const store = addCategory(await readManualStore(), result.value);
  await writeManualStore(store);
  return NextResponse.json(store.categories, { status: 201 });
}

/** Boş kategoriyi siler; penaltısı olan kategori silinemez. */
export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body: unknown = await request.json().catch(() => null);
  const result = validateCategory(body);
  if (!result.ok) return NextResponse.json({ error: result.errors.join(" ") }, { status: 400 });
  const { store, removed } = removeCategory(await readManualStore(), result.value);
  if (!removed) {
    return NextResponse.json({ error: "Bu kategoride penaltı var; önce onları sil." }, { status: 409 });
  }
  await writeManualStore(store);
  return NextResponse.json(store.categories);
}
