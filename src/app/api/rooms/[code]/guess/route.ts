import { NextResponse } from "next/server";
import { submitRoomGuess } from "@/game/room";
import { parseGuess } from "@/server/parseGuess";
import { errorResponse, findRoomForPlayer, readBody, roomErrorResponse, stateResponse } from "@/server/roomRequests";
import { mutateRoom } from "@/server/roomStore";

/** Tahmini kilitler. Gövde: `{ playerId, guess }`; `guess: null` süresi dolan turdur. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const found = findRoomForPlayer((await params).code, body.playerId);
  if (found instanceof NextResponse) return found;
  const guess = parseGuess(body);
  if (guess === undefined) return errorResponse("Geçersiz tahmin.", 400);

  try {
    mutateRoom(found.room, (room) => submitRoomGuess(room, found.playerId, guess, Date.now()));
  } catch (error) {
    return roomErrorResponse(error);
  }
  return stateResponse(found.room, found.playerId);
}
