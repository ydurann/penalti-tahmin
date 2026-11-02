import { NextResponse } from "next/server";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import { createGame, currentRound } from "@/game/session";
import type { NewGameResponse } from "@/game/types";
import { saveGame } from "@/server/gameStore";

export async function POST() {
  const game = createGame(SAMPLE_PENALTIES, {
    id: crypto.randomUUID(),
    now: Date.now(),
  });
  saveGame(game);
  return NextResponse.json<NewGameResponse>({
    gameId: game.id,
    round: currentRound(game),
  });
}
