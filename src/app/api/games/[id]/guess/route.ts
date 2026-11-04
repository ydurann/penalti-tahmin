import { NextResponse } from "next/server";
import { recordProgress } from "@/game/challenge";
import { GameFlowError, submitGuess } from "@/game/session";
import { recordGame } from "@/game/soloBoard";
import { updateBoard } from "@/server/challengeStore";
import { getGame } from "@/server/gameStore";
import { loadPool } from "@/server/manualStore";
import { parseGuess } from "@/server/parseGuess";
import { updateSoloBoard } from "@/server/soloStore";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const game = getGame((await params).id);
  if (!game) {
    return NextResponse.json({ error: "Oyun bulunamadı.", code: "game.notFound" }, { status: 404 });
  }

  const guess = parseGuess(await request.json().catch(() => undefined));
  if (guess === undefined) {
    return NextResponse.json({ error: "Geçersiz tahmin.", code: "game.badGuess" }, { status: 400 });
  }

  try {
    const now = Date.now();
    const result = submitGuess(game, guess, now);
    // Challenge denemesinde her tur tabloya işlenir; yarıda bırakılan deneme de sayılır.
    if (game.challenge) {
      const { week, token } = game.challenge;
      await updateBoard(week, await loadPool(), (board) => ({
        board: recordProgress(board, token, result.totalScore, result.finished, now),
        result: undefined,
      }));
    }
    // Takma adla oynanan tek kişilik oyun bitince toplam puana eklenir.
    if (game.solo && result.finished) {
      const { token, name, region } = game.solo;
      await updateSoloBoard((board) => recordGame(board, token, { name, region }, result.totalScore, now));
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GameFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}
