import { NextResponse } from "next/server";
import { startRoom } from "@/game/room";
import { errorResponse, findRoomForPlayer, readBody, roomErrorResponse, stateResponse } from "@/server/roomRequests";
import { mutateRoom } from "@/server/roomStore";

/** Ev sahibi oyunu başlatır. Gövde: `{ playerId }`. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);
  const found = findRoomForPlayer((await params).code, body.playerId);
  if (found instanceof NextResponse) return found;

  try {
    mutateRoom(found.room, (room) => startRoom(room, found.playerId, Date.now()));
  } catch (error) {
    return roomErrorResponse(error);
  }
  return stateResponse(found.room, found.playerId);
}
