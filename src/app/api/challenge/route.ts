import { NextResponse } from "next/server";
import { challengeStatus, weekOf } from "@/game/challenge";
import { parseRegionFilter } from "@/game/regions";
import type { ChallengeStatus } from "@/game/types";
import { readBoard } from "@/server/challengeStore";
import { parseToken } from "@/server/challengeRequests";
import { loadPool } from "@/server/manualStore";
import { withChallengeSeeds } from "@/server/seeds";

export const dynamic = "force-dynamic";

/** Bu haftanın durumu ve sıralaması; `?token=` senin sıran, `?region=` bölge süzgeci. */
export async function GET(request: Request) {
  const now = Date.now();
  const week = weekOf(now);
  const params = new URL(request.url).searchParams;
  const token = parseToken(params.get("token"));
  const region = parseRegionFilter(params.get("region"));
  const board = withChallengeSeeds(await readBoard(week.key, await loadPool()), week);
  return NextResponse.json<ChallengeStatus>(challengeStatus(board, week, token, now, region));
}
