import { NextResponse } from "next/server";
import { GameFlowError, submitGuess } from "@/game/session";
import { getGame } from "@/server/gameStore";
import { parseGuess } from "@/server/parseGuess";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const game = getGame((await params).id);
  if (!game) {
    return NextResponse.json({ error: "Oyun bulunamadı." }, { status: 404 });
  }

  const guess = parseGuess(await request.json().catch(() => undefined));
  if (guess === undefined) {
    return NextResponse.json({ error: "Geçersiz tahmin." }, { status: 400 });
  }

  try {
    return NextResponse.json(submitGuess(game, guess, Date.now()));
  } catch (error) {
    if (error instanceof GameFlowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
