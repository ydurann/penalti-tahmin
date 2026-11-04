import { NextResponse } from "next/server";
import { publicAds, type PublicAd } from "@/game/ads";
import { readAdStore } from "@/server/adStore";

export const dynamic = "force-dynamic";

/** Sahnedeki reklam bandının içeriği: yalnızca açık reklamlar. */
export async function GET() {
  return NextResponse.json<PublicAd[]>(publicAds(await readAdStore()));
}
