import { NextResponse } from "next/server";
import { loadPool } from "@/server/manualStore";

/** Docker HEALTHCHECK ve izleme için: havuz okunabiliyorsa 200. */
export async function GET() {
  const pool = await loadPool();
  return NextResponse.json(
    { ok: true, penalties: pool.length, uptimeSeconds: Math.round(process.uptime()) },
    { headers: { "cache-control": "no-store" } },
  );
}
