import { hintFor } from "./hints";
import { earlySeconds, isExactZone, scoreGuess } from "./scoring";
import { LATE_GRACE_MS, ROUND_TIME_MS, ROUNDS_PER_GAME } from "./session";
import type {
  Guess,
  Hint,
  Penalty,
  PublicRound,
  RoomPhase,
  RoomPlayerPublic,
  RoomState,
  RoundResult,
} from "./types";

/**
 * Çok oyunculu oda: herkes aynı penaltıları aynı anda tahmin eder. Zaman çizelgesi sunucuya
 * aittir; tur süresi dolunca ya da herkes tahminini kilitleyince açıklama evresi başlar,
 * `REVEAL_MS` sonra sıradaki tur kendiliğinden açılır. Saf mantıktır; depo ve yayın
 * `src/server/roomStore.ts` içindedir.
 */

/** Açıklama evresinin süresi: vuruş animasyonu ve sonucu okuma payı. */
export const REVEAL_MS = 8_000;
export const MAX_PLAYERS = 8;
export const MAX_NAME_LENGTH = 20;

/** Oda akışına aykırı istekler; `code` istemcide çevrilir. */
export class RoomError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  streak: number;
  joinedAt: number;
  /** Bu turdaki tahmin; kilitlenmediyse undefined, süresi geçerek geldiyse null. */
  guess: Guess | null | undefined;
  /** Tahminin kilitlendiği sunucu zamanı; hız bonusu bundan hesaplanır. */
  guessedAt: number | null;
  /** Bu turda ipucu istedi mi. */
  hintUsed: boolean;
  results: RoundResult[];
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  penalties: Penalty[];
  phase: RoomPhase;
  index: number;
  roundStartedAt: number;
  revealAt: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function newPlayer(id: string, name: string, now: number): RoomPlayer {
  return { id, name, score: 0, streak: 0, joinedAt: now, guess: undefined, guessedAt: null, hintUsed: false, results: [] };
}

export function createRoom(
  pool: readonly Penalty[],
  options: {
    code: string;
    host: { id: string; name: string };
    now: number;
    count?: number;
    random?: () => number;
  },
): Room {
  const { code, host, now, count = ROUNDS_PER_GAME, random = Math.random } = options;
  if (pool.length < count) throw new RoomError("Seçilen turnuvalarda yeterli penaltı yok.", "pool.tooSmall");
  return {
    code,
    hostId: host.id,
    players: new Map([[host.id, newPlayer(host.id, host.name, now)]]),
    penalties: shuffled(pool, random).slice(0, count),
    phase: "lobby",
    index: 0,
    roundStartedAt: now,
    revealAt: now,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

export function joinRoom(room: Room, player: { id: string; name: string }, now: number): void {
  if (room.phase !== "lobby") throw new RoomError("Oyun başladı; bu odaya artık katılınamaz.", "room.started");
  if (room.players.size >= MAX_PLAYERS) throw new RoomError(`Oda dolu (en çok ${MAX_PLAYERS} oyuncu).`, "room.full");
  if (room.players.has(player.id)) return;
  room.players.set(player.id, newPlayer(player.id, player.name, now));
  room.updatedAt = now;
}

/** Lobideyken ayrılan oyuncu silinir; ev sahibi ayrılırsa sıradaki oyuncu ev sahibi olur. */
export function leaveRoom(room: Room, playerId: string, now: number): void {
  if (room.phase !== "lobby" || !room.players.has(playerId)) return;
  room.players.delete(playerId);
  if (room.hostId === playerId) {
    const next = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) room.hostId = next.id;
  }
  room.updatedAt = now;
}

export function startRoom(room: Room, playerId: string, now: number): void {
  if (room.hostId !== playerId) throw new RoomError("Oyunu yalnızca odayı kuran başlatabilir.", "room.notHost");
  if (room.phase !== "lobby") throw new RoomError("Oyun zaten başladı.", "room.alreadyStarted");
  room.phase = "guessing";
  room.index = 0;
  room.roundStartedAt = now;
  room.updatedAt = now;
}

const deadlineOf = (room: Room) => room.roundStartedAt + ROUND_TIME_MS;

/** Herkesin tahminini puanlar ve açıklama evresine geçer. Kilitlemeyenler sıfır alır. */
function revealRound(room: Room, now: number): void {
  const { answer } = room.penalties[room.index];
  const finished = room.index === room.penalties.length - 1;
  for (const player of room.players.values()) {
    const accepted = player.guess ?? null;
    player.streak = accepted && isExactZone(accepted, answer) ? player.streak + 1 : 0;
    const early =
      accepted && player.guessedAt !== null
        ? earlySeconds(player.guessedAt - room.roundStartedAt, ROUND_TIME_MS)
        : 0;
    const points = scoreGuess(accepted, answer, player.streak, player.hintUsed, early);
    player.score += points.total;
    player.results.push({
      guess: accepted,
      timedOut: accepted === null,
      answer,
      points,
      totalScore: player.score,
      streak: player.streak,
      finished,
    });
  }
  room.phase = "reveal";
  room.revealAt = now;
  room.updatedAt = now;
}

/** Oyuncuya bu turun ipucunu verir; kilitledikten sonra istenemez. */
export function requestRoomHint(room: Room, playerId: string, now: number): Hint {
  const player = room.players.get(playerId);
  if (!player) throw new RoomError("Bu odada böyle bir oyuncu yok.", "room.noPlayer");
  if (room.phase !== "guessing") throw new RoomError("İpucu yalnızca tahmin sırasında alınabilir.", "room.hintPhase");
  if (player.guess !== undefined) throw new RoomError("Tahmin kilitlendikten sonra ipucu alınamaz.", "room.hintAfterLock");
  player.hintUsed = true;
  room.updatedAt = now;
  const penalty = room.penalties[room.index];
  return hintFor(penalty.id, penalty.answer);
}

export function submitRoomGuess(room: Room, playerId: string, guess: Guess | null, now: number): void {
  const player = room.players.get(playerId);
  if (!player) throw new RoomError("Bu odada böyle bir oyuncu yok.", "room.noPlayer");
  if (room.phase !== "guessing") throw new RoomError("Şu anda tahmin alınmıyor.", "room.noGuessPhase");
  if (player.guess !== undefined) throw new RoomError("Bu tur için tahmin zaten alındı.", "room.alreadyGuessed");
  const late = now - room.roundStartedAt > ROUND_TIME_MS + LATE_GRACE_MS;
  player.guess = late ? null : guess;
  player.guessedAt = now;
  room.updatedAt = now;
  if ([...room.players.values()].every((p) => p.guess !== undefined)) revealRound(room, now);
}

function advanceRoom(room: Room, now: number): void {
  if (room.index >= room.penalties.length - 1) {
    room.phase = "finished";
  } else {
    room.index += 1;
    room.phase = "guessing";
    room.roundStartedAt = now;
    for (const player of room.players.values()) {
      player.guess = undefined;
      player.guessedAt = null;
      player.hintUsed = false;
    }
  }
  room.updatedAt = now;
}

/** Zamanı dolan evreleri ilerletir; bir şey değiştiyse true döner. Depo bunu düzenli çağırır. */
export function tickRoom(room: Room, now: number): boolean {
  if (room.phase === "guessing" && now >= deadlineOf(room) + LATE_GRACE_MS) {
    revealRound(room, now);
    return true;
  }
  if (room.phase === "reveal" && now >= room.revealAt + REVEAL_MS) {
    advanceRoom(room, now);
    return true;
  }
  return false;
}

function publicRound(room: Room): PublicRound {
  const { player, situation, minute, score, history, match } = room.penalties[room.index];
  return {
    player,
    situation,
    minute,
    score,
    history,
    ...(match ? { match } : {}),
    number: room.index + 1,
    totalRounds: room.penalties.length,
    timeLimitMs: ROUND_TIME_MS,
  };
}

function publicPlayer(room: Room, player: RoomPlayer): RoomPlayerPublic {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    streak: player.streak,
    isHost: player.id === room.hostId,
    submitted: room.phase === "guessing" && player.guess !== undefined,
    hintUsed: (room.phase === "guessing" || room.phase === "reveal") && player.hintUsed,
    lastPoints: room.phase === "reveal" ? player.results[room.index]?.points.total ?? 0 : null,
  };
}

/** Bir oyuncunun gördüğü durum; cevap yalnızca açıklama evresinde ve sonucuyla birlikte gider. */
export function roomState(room: Room, playerId: string, now: number): RoomState {
  const you = room.players.get(playerId);
  const inRound = room.phase === "guessing" || room.phase === "reveal";
  const yours = room.phase === "reveal" ? you?.results[room.index] : undefined;
  return {
    code: room.code,
    phase: room.phase,
    you: playerId,
    hostId: room.hostId,
    players: [...room.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => publicPlayer(room, p)),
    totalRounds: room.penalties.length,
    round: inRound ? publicRound(room) : null,
    serverNow: now,
    deadline: room.phase === "guessing" ? deadlineOf(room) : null,
    nextRoundAt: room.phase === "reveal" ? room.revealAt + REVEAL_MS : null,
    reveal: yours ? { answer: yours.answer, yours } : null,
    hint:
      inRound && you?.hintUsed
        ? hintFor(room.penalties[room.index].id, room.penalties[room.index].answer)
        : null,
    version: room.version,
  };
}
