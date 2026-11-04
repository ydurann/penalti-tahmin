import { NextResponse } from "next/server";
import { MAX_NAME_LENGTH, RoomError, roomState, type Room } from "@/game/room";
import { getRoom } from "./roomStore";

/** Oyuncu adını kırpar ve sınırlar; boşsa null döner. */
export function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

export const parsePlayerId = (value: unknown): string | null =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Hata yanıtı; `code` istemcide dile göre çevrilir, `error` Türkçe yedek metindir. */
export const errorResponse = (message: string, status: number, code?: string) =>
  NextResponse.json(code ? { error: message, code } : { error: message }, { status });

/** Kod ve oyuncu kimliğiyle odayı bulur; yoksa hata yanıtı döner. */
export function findRoomForPlayer(
  code: string,
  playerId: unknown,
): { room: Room; playerId: string } | NextResponse {
  const room = getRoom(code);
  if (!room) return errorResponse("Oda bulunamadı ya da süresi doldu.", 404, "room.notFound");
  const id = parsePlayerId(playerId);
  if (!id || !room.players.has(id)) return errorResponse("Bu odada böyle bir oyuncu yok.", 403, "room.noPlayer");
  return { room, playerId: id };
}

/** Oda mantığındaki hataları 409, diğerlerini yukarı fırlatır. */
export function roomErrorResponse(error: unknown): NextResponse {
  if (error instanceof RoomError) return errorResponse(error.message, 409, error.code);
  throw error;
}

export const stateResponse = (room: Room, playerId: string) =>
  NextResponse.json(roomState(room, playerId, Date.now()));
