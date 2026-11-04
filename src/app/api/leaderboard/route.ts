import { NextResponse } from "next/server";
import { parseRegionFilter } from "@/game/regions";
import { soloStatus } from "@/game/soloBoard";
import type { SoloStatus } from "@/game/types";
import { parseToken } from "@/server/challengeRequests";
import { withSoloSeeds } from "@/server/seeds";
import { readSoloBoard } from "@/server/soloStore";

export const dynamic = "force-dynamic";

/** Toplam puan sıralaması: ilk 10 ve `?token=` ile senin sıran; `?region=` bölge ya da "world". */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = parseToken(params.get("token"));
  const region = parseRegionFilter(params.get("region"));
  const board = withSoloSeeds(await readSoloBoard(), Date.now());
  return NextResponse.json<SoloStatus>(soloStatus(board, token, region));
}
