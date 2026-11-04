import { NextResponse } from "next/server";
import { addPenalty, toPenalty, validateManualPenalty } from "@/data/manual";
import { REAL_PENALTIES } from "@/data/realPenalties";
import { requireAdmin } from "@/server/adminAuth";
import { readManualStore, writeManualStore } from "@/server/manualStore";

export const dynamic = "force-dynamic";

/** Elle girilen kategoriler ve penaltılar. */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json(await readManualStore());
}

/** Yeni penaltı ekler; gövde `ManualPenaltyInput` alanlarını taşır. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body: unknown = await request.json().catch(() => null);
  const result = validateManualPenalty(body);
  if (!result.ok) return NextResponse.json({ error: result.errors.join(" "), errors: result.errors }, { status: 400 });

  const store = await readManualStore();
  const pool = [...REAL_PENALTIES, ...store.penalties];
  const penalty = toPenalty(result.value, `manual-${crypto.randomUUID().slice(0, 8)}`, pool);
  await writeManualStore(addPenalty(store, penalty));
  return NextResponse.json(penalty, { status: 201 });
}
