import { tickRoom, type Room } from "@/game/room";

/**
 * Odalar bellekte, `globalThis` üzerinde durur (HMR'da kaybolmasın). Tek sunucu örneğinde
 * çalışır; yeniden başlayınca silinir. Her oda değişikliğinde abonelere (SSE yazıcıları)
 * haber verilir. Tek bir zamanlayıcı tüm odaların evrelerini ilerletir.
 */
const IDLE_TTL_MS = 2 * 60 * 60 * 1000;
const TICK_MS = 250;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

type Listener = () => void;

const holder = globalThis as typeof globalThis & {
  __rooms?: Map<string, Room>;
  __roomListeners?: Map<string, Set<Listener>>;
  __roomTicker?: ReturnType<typeof setInterval>;
};
const rooms = (holder.__rooms ??= new Map<string, Room>());
const listeners = (holder.__roomListeners ??= new Map<string, Set<Listener>>());

function notify(code: string): void {
  for (const listener of listeners.get(code) ?? []) {
    try {
      listener();
    } catch {
      // kapanmış bir yayın; abonelikten çıkışı kendi temizler
    }
  }
}

function ensureTicker(): void {
  if (holder.__roomTicker) return;
  holder.__roomTicker = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.updatedAt > IDLE_TTL_MS) {
        rooms.delete(code);
        notify(code);
        listeners.delete(code);
        continue;
      }
      if (tickRoom(room, now)) {
        room.version++;
        notify(code);
      }
    }
    if (rooms.size === 0 && holder.__roomTicker) {
      clearInterval(holder.__roomTicker);
      holder.__roomTicker = undefined;
    }
  }, TICK_MS);
  // Zamanlayıcı süreci açık tutmasın.
  holder.__roomTicker.unref?.();
}

export function newRoomCode(random: () => number = Math.random): string {
  let code = "";
  do {
    code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
  } while (rooms.has(code));
  return code;
}

export const newPlayerId = () => crypto.randomUUID();

export function saveRoom(room: Room): void {
  rooms.set(room.code, room);
  ensureTicker();
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

/** Odayı değiştirir, sürümünü artırır ve abonelere haber verir. */
export function mutateRoom<T>(room: Room, change: (room: Room) => T): T {
  const result = change(room);
  room.version++;
  notify(room.code);
  return result;
}

export function subscribeRoom(code: string, listener: Listener): () => void {
  const set = listeners.get(code) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(code, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(code);
  };
}
