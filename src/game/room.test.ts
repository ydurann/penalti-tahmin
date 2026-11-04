import { describe, expect, it } from "vitest";
import { SAMPLE_PENALTIES } from "@/data/penalties";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  MAX_PLAYERS,
  requestRoomHint,
  REVEAL_MS,
  RoomError,
  roomState,
  startRoom,
  submitRoomGuess,
  tickRoom,
} from "./room";
import { LATE_GRACE_MS, ROUND_TIME_MS } from "./session";
import type { Guess, Penalty, PenaltyAnswer } from "./types";

const answer: PenaltyAnswer = { zone: { col: 0, row: 2 }, shot: "placed", outcome: "goal", keeperDive: 2 };
const pool: Penalty[] = [1, 2, 3].map((n) => ({ ...SAMPLE_PENALTIES[0], id: `p${n}`, answer }));
// Vuruş tipi bilerek yanlış: yalnızca bölge puanı ölçülür.
const hit: Guess = { target: { col: 0, row: 2 }, shot: "power" };
const miss: Guess = { target: { col: 2, row: 0 }, shot: "power" };

function roomWith(names: string[], now = 0) {
  const room = createRoom(pool, { code: "ABCDE", host: { id: "h", name: names[0] }, now, count: 3 });
  names.slice(1).forEach((name, i) => joinRoom(room, { id: `p${i + 1}`, name }, now));
  return room;
}

describe("oda kurma ve katılma", () => {
  it("ev sahibiyle lobide başlar, oyuncular katılır", () => {
    const room = roomWith(["Ayşe", "Can"]);
    expect(room.phase).toBe("lobby");
    const state = roomState(room, "p1", 0);
    expect(state.players.map((p) => [p.name, p.isHost])).toEqual([["Ayşe", true], ["Can", false]]);
    expect(state.round).toBeNull();
    expect(state.reveal).toBeNull();
  });

  it("yetersiz havuzla kurulamaz, dolu odaya ve başlamış oyuna katılınamaz", () => {
    expect(() => createRoom(pool.slice(0, 2), { code: "X", host: { id: "h", name: "A" }, now: 0, count: 3 })).toThrow(RoomError);
    const room = roomWith(Array.from({ length: MAX_PLAYERS }, (_, i) => `O${i}`));
    expect(() => joinRoom(room, { id: "fazla", name: "Z" }, 0)).toThrow(RoomError);
    const started = roomWith(["A"]);
    startRoom(started, "h", 0);
    expect(() => joinRoom(started, { id: "geç", name: "G" }, 1)).toThrow(RoomError);
  });

  it("aynı oyuncu ikinci kez katılınca çoğalmaz", () => {
    const room = roomWith(["A", "B"]);
    joinRoom(room, { id: "p1", name: "B" }, 5);
    expect(room.players.size).toBe(2);
  });

  it("lobiden ayrılan silinir, ev sahibi ayrılırsa sıradaki devralır", () => {
    const room = roomWith(["A", "B", "C"]);
    leaveRoom(room, "h", 1);
    expect(room.hostId).toBe("p1");
    expect(room.players.has("h")).toBe(false);
    startRoom(room, "p1", 2);
    leaveRoom(room, "p2", 3);
    expect(room.players.has("p2")).toBe(true);
  });

  it("oyunu yalnızca ev sahibi ve yalnızca lobideyken başlatır", () => {
    const room = roomWith(["A", "B"]);
    expect(() => startRoom(room, "p1", 0)).toThrow(RoomError);
    startRoom(room, "h", 10);
    expect(room.phase).toBe("guessing");
    expect(() => startRoom(room, "h", 11)).toThrow(RoomError);
    const state = roomState(room, "h", 12);
    expect(state.round?.number).toBe(1);
    expect(state.deadline).toBe(10 + ROUND_TIME_MS);
  });
});

describe("tur akışı", () => {
  // Sürenin sonunda kilitlenen tahminler; hız bonusu devreye girmez.
  const late = ROUND_TIME_MS - 500;

  it("herkes kilitleyince tur erkenden açıklanır ve puanlanır", () => {
    const room = roomWith(["A", "B"]);
    startRoom(room, "h", 0);
    submitRoomGuess(room, "h", hit, late);
    expect(room.phase).toBe("guessing");
    expect(roomState(room, "p1", late).players.map((p) => p.submitted)).toEqual([true, false]);
    submitRoomGuess(room, "p1", miss, late + 100);
    expect(room.phase).toBe("reveal");
    const state = roomState(room, "h", late + 100);
    expect(state.reveal?.yours.points.total).toBe(100);
    expect(state.players.map((p) => [p.score, p.lastPoints])).toEqual([[100, 100], [0, 0]]);
    expect(state.nextRoundAt).toBe(late + 100 + REVEAL_MS);
  });

  it("erken kilitleyen oyuncu hız bonusu alır, geç kilitleyen almaz", () => {
    const room = roomWith(["A", "B"]);
    startRoom(room, "h", 0);
    submitRoomGuess(room, "h", hit, 500);
    submitRoomGuess(room, "p1", hit, late);
    const state = roomState(room, "h", late);
    expect(state.reveal?.yours.points).toMatchObject({ zone: 100, secondsEarly: 29, speed: 58, total: 158 });
    expect(state.players.map((p) => p.lastPoints)).toEqual([158, 100]);
  });

  it("süre dolunca kilitlemeyenler sıfır alır, sonra sıradaki tur açılır", () => {
    const room = roomWith(["A", "B"]);
    startRoom(room, "h", 0);
    submitRoomGuess(room, "h", hit, 500);
    expect(tickRoom(room, ROUND_TIME_MS)).toBe(false);
    expect(tickRoom(room, ROUND_TIME_MS + LATE_GRACE_MS)).toBe(true);
    expect(room.phase).toBe("reveal");
    const late = roomState(room, "p1", ROUND_TIME_MS + LATE_GRACE_MS);
    expect(late.reveal?.yours.timedOut).toBe(true);
    expect(late.reveal?.yours.points.total).toBe(0);

    const nextAt = ROUND_TIME_MS + LATE_GRACE_MS + REVEAL_MS;
    expect(tickRoom(room, nextAt - 1)).toBe(false);
    expect(tickRoom(room, nextAt)).toBe(true);
    expect(room.phase).toBe("guessing");
    expect(room.index).toBe(1);
    expect(roomState(room, "h", nextAt).players.every((p) => !p.submitted)).toBe(true);
  });

  it("geç gelen tahmin süresi dolmuş sayılır, ikinci tahmin reddedilir", () => {
    const room = roomWith(["A"]);
    startRoom(room, "h", 0);
    expect(() => {
      submitRoomGuess(room, "h", hit, 100);
      submitRoomGuess(room, "h", hit, 200);
    }).toThrow(RoomError);
    const room2 = roomWith(["A"]);
    startRoom(room2, "h", 0);
    submitRoomGuess(room2, "h", hit, ROUND_TIME_MS + LATE_GRACE_MS + 1);
    expect(roomState(room2, "h", 0).reveal?.yours.timedOut).toBe(true);
  });

  it("seriyi oyuncu başına biriktirir ve son turdan sonra biter", () => {
    const room = roomWith(["A", "B"]);
    startRoom(room, "h", 0);
    let now = 0;
    for (let round = 0; round < 3; round++) {
      submitRoomGuess(room, "h", hit, now + late);
      submitRoomGuess(room, "p1", round === 2 ? hit : miss, now + late + 100);
      now += late + 100 + REVEAL_MS;
      tickRoom(room, now);
    }
    expect(room.phase).toBe("finished");
    const state = roomState(room, "h", now);
    expect(state.players.map((p) => [p.name, p.score, p.streak])).toEqual([["A", 100 + 125 + 150, 3], ["B", 100, 1]]);
    expect(state.round).toBeNull();
    expect(state.deadline).toBeNull();
  });

  it("ipucu oyuncuya özeldir, puanını yarılar ve kilitledikten sonra alınamaz", () => {
    const room = roomWith(["A", "B"]);
    startRoom(room, "h", 0);
    const hint = requestRoomHint(room, "h", 100);
    expect(roomState(room, "h", 100).hint).toEqual(hint);
    expect(roomState(room, "p1", 100).hint).toBeNull();
    expect(roomState(room, "p1", 100).players.map((p) => p.hintUsed)).toEqual([true, false]);
    submitRoomGuess(room, "h", hit, late);
    expect(() => requestRoomHint(room, "h", late + 10)).toThrow(RoomError);
    submitRoomGuess(room, "p1", hit, late + 100);
    const state = roomState(room, "h", late + 100);
    expect(state.players.map((p) => p.lastPoints)).toEqual([50, 100]);
    expect(state.reveal?.yours.points.hintUsed).toBe(true);
    tickRoom(room, late + 100 + REVEAL_MS);
    expect(roomState(room, "h", late + 200 + REVEAL_MS).players.every((p) => !p.hintUsed)).toBe(true);
  });

  it("tahmin evresinde cevap sızmaz", () => {
    const room = roomWith(["A"]);
    startRoom(room, "h", 0);
    const json = JSON.stringify(roomState(room, "h", 1));
    for (const key of ["answer", "keeperDive", "outcome"]) expect(json).not.toContain(`"${key}"`);
  });
});
