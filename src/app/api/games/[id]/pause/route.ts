import { NextResponse } from "next/server";
import { GameFlowError, pauseGame } from "@/game/session";
import { getGame } from "@/server/gameStore";

/** Tahmin süresini durdurur (yalnızca tek kişilik oyun, tahmin evresi). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const game = getGame((await params).id);
  if (!game) {
    return NextResponse.json({ error: "Oyun bulunamadı.", code: "game.notFound" }, { status: 404 });
  }

  try {
    pauseGame(game, Date.now());
    return NextResponse.json({ paused: true });
  } catch (error) {
    if (error instanceof GameFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}
