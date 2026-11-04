import { NextResponse } from "next/server";
import { GameFlowError, requestHint } from "@/game/session";
import type { Hint } from "@/game/types";
import { getGame } from "@/server/gameStore";

/** Bu turun ipucunu verir; tur puanı yarıya iner. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const game = getGame((await params).id);
  if (!game) {
    return NextResponse.json({ error: "Oyun bulunamadı.", code: "game.notFound" }, { status: 404 });
  }

  try {
    return NextResponse.json<Hint>(requestHint(game, Date.now()));
  } catch (error) {
    if (error instanceof GameFlowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}
