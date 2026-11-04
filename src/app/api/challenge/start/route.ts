import { NextResponse } from "next/server";
import { ChallengeError, startAttempt, weekOf } from "@/game/challenge";
import { isRegion } from "@/game/regions";
import { createGame, currentRound, ROUNDS_PER_GAME } from "@/game/session";
import type { NewGameResponse } from "@/game/types";
import { updateBoard, weekPenalties } from "@/server/challengeStore";
import { parseToken } from "@/server/challengeRequests";
import { saveGame } from "@/server/gameStore";
import { loadPool } from "@/server/manualStore";
import { errorResponse, parseName, readBody } from "@/server/roomRequests";

export const dynamic = "force-dynamic";

/** Haftalık denemeyi başlatır. Gövde: `{ token, name, region }`. Aynı anahtar haftada bir oynar. */
export async function POST(request: Request) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const token = parseToken(body.token);
  const name = parseName(body.name);
  const region = isRegion(body.region) ? body.region : null;
  if (!token) return errorResponse("Oyuncu anahtarı eksik.", 400);
  if (!name) return errorResponse("Bir takma ad gir (en çok 20 karakter).", 400, "room.badName");
  if (!region) return errorResponse("Bir bölge seç.", 400, "badRegion");

  const now = Date.now();
  const week = weekOf(now);
  const pool = await loadPool();

  try {
    const game = await updateBoard(week.key, pool, (board) => {
      const penalties = weekPenalties(board, pool);
      if (penalties.length < ROUNDS_PER_GAME) {
        throw new ChallengeError("Bu haftanın penaltıları hazır değil; havuzda yeterli veri yok.", "challenge.notReady");
      }
      const next = startAttempt(board, token, { name, region }, now);
      const session = createGame(penalties, { id: crypto.randomUUID(), now, fixedOrder: true });
      session.challenge = { week: week.key, token };
      return { board: next, result: session };
    });
    saveGame(game);
    return NextResponse.json<NewGameResponse>({ gameId: game.id, round: currentRound(game) });
  } catch (error) {
    if (error instanceof ChallengeError) return errorResponse(error.message, 409, error.code);
    throw error;
  }
}
