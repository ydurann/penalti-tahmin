import { describe, expect, it } from "vitest";
import type { Index, Outcome, PenaltyAnswer, ShotType } from "@/game/types";
import {
  backNetZ,
  BALL_RADIUS,
  ballPosition,
  ballRestZ,
  flightTime,
  GOAL,
  KEEPER_Z,
  KICK_AT,
  missPoint,
  outPoint,
  shotDurationMs,
  SPOT_Z,
  targetPoint,
  zoneCenter,
} from "./animation";

const answerOf = (
  col: Index,
  row: Index,
  shot: ShotType,
  outcome: Outcome,
): PenaltyAnswer => ({ zone: { col, row }, shot, outcome, keeperDive: col });

const INDEXES: Index[] = [0, 1, 2];
const SHOTS: ShotType[] = ["placed", "power", "panenka"];
const CASES = INDEXES.flatMap((col) =>
  INDEXES.flatMap((row) =>
    SHOTS.flatMap((shot) =>
      (["goal", "saved"] as Outcome[]).map((outcome) => answerOf(col, row, shot, outcome)),
    ),
  ),
);

describe("zoneCenter", () => {
  it("bölgeleri kalenin içine, oyuncunun gözünden yerleştirir", () => {
    const [leftX, topY] = zoneCenter({ col: 0, row: 0 });
    const [rightX, bottomY] = zoneCenter({ col: 2, row: 2 });
    expect(leftX).toBeLessThan(0);
    expect(rightX).toBeGreaterThan(0);
    expect(topY).toBeGreaterThan(bottomY);
    expect(Math.abs(leftX)).toBeLessThan(GOAL.width / 2);
    expect(topY).toBeLessThan(GOAL.height);
    expect(bottomY).toBeGreaterThan(0);
  });
});

describe("ballPosition", () => {
  it("vuruştan önce top penaltı noktasında durur", () => {
    const answer = answerOf(0, 0, "power", "goal");
    expect(ballPosition(0, answer)).toEqual([0, BALL_RADIUS, SPOT_Z]);
    expect(ballPosition(KICK_AT, answer)).toEqual([0, BALL_RADIUS, SPOT_Z]);
  });

  it.each(CASES.map((a) => [a.zone.col, a.zone.row, a.shot, a.outcome, a] as const))(
    "bölge %i-%i, %s, %s: hedefe varır ve geçerli bir yerde durur",
    (_col, _row, shot, outcome, answer) => {
      const [tx, ty] = zoneCenter(answer.zone);
      const arrival = ballPosition(KICK_AT + flightTime(shot), answer);
      expect(arrival[0]).toBeCloseTo(tx, 5);
      expect(arrival[1]).toBeCloseTo(ty, 5);
      expect(arrival[2]).toBeCloseTo(outcome === "saved" ? KEEPER_Z : 0, 5);

      const final = ballPosition(shotDurationMs(answer) / 1000 + 2, answer);
      expect(final[1]).toBeCloseTo(BALL_RADIUS, 5);
      if (outcome === "goal") expect(final[2]).toBeCloseTo(ballRestZ(BALL_RADIUS), 5);
      else expect(final[2]).toBeGreaterThan(KEEPER_Z);
    },
  );

  it("top uçuş boyunca yerin altına inmez", () => {
    for (const answer of [...CASES, ...MISSES]) {
      for (let t = 0; t < 3; t += 0.02) {
        expect(ballPosition(t, answer)[1]).toBeGreaterThanOrEqual(BALL_RADIUS - 1e-9);
      }
    }
  });

  const MISSES = INDEXES.flatMap((col) =>
    INDEXES.flatMap((row) => SHOTS.map((shot) => answerOf(col, row, shot, "missed"))),
  );

  it.each(MISSES.map((a) => [a.zone.col, a.zone.row, a.shot, a] as const))(
    "kaçan %i-%i, %s: çerçevenin dışından geçer, arkada yerde durur",
    (_col, _row, shot, answer) => {
      const [tx, ty] = missPoint(answer);
      const arrival = ballPosition(KICK_AT + flightTime(shot), answer);
      expect(arrival[0]).toBeCloseTo(tx, 5);
      expect(arrival[1]).toBeCloseTo(ty, 5);
      expect(arrival[2]).toBeCloseTo(0, 5);
      expect(Math.abs(tx) > GOAL.width / 2 || ty > GOAL.height).toBe(true);

      const final = ballPosition(shotDurationMs(answer) / 1000 + 2, answer);
      expect(final[1]).toBeCloseTo(BALL_RADIUS, 5);
      expect(final[2]).toBeLessThan(-3);
      expect(Math.abs(final[0])).toBeGreaterThanOrEqual(Math.abs(tx));
    },
  );

  it("kaçan top çizgiyi geçtikten sonra geri gelmez", () => {
    const miss = answerOf(0, 1, "power", "missed");
    let previous = SPOT_Z;
    for (let t = KICK_AT; t <= 4; t += 0.01) {
      const z = ballPosition(t, miss)[2];
      expect(z).toBeLessThanOrEqual(previous + 1e-6);
      previous = z;
    }
  });

  it("hedef nokta kaleyi bulan vuruşta bölge, kaçanda dışarısıdır", () => {
    expect(targetPoint(answerOf(0, 2, "placed", "goal"))).toEqual(zoneCenter({ col: 0, row: 2 }));
    expect(targetPoint(answerOf(2, 1, "placed", "missed"))[0]).toBeGreaterThan(GOAL.width / 2);
    expect(missPoint(answerOf(1, 2, "power", "missed"))[1]).toBeGreaterThan(GOAL.height);
    expect(outPoint()[1]).toBeGreaterThan(GOAL.height);
  });

  it("panenka sert vuruştan daha yavaş ve daha yüksek gider", () => {
    expect(flightTime("panenka")).toBeGreaterThan(flightTime("power"));
    const midHeight = (shot: ShotType) =>
      ballPosition(KICK_AT + flightTime(shot) / 2, answerOf(1, 1, shot, "goal"))[1];
    expect(midHeight("panenka")).toBeGreaterThan(midHeight("power"));
  });
});

describe("topun fileye girişi", () => {
  it("golde top filenin arkasına kadar iter, sonra önüne geri döner", () => {
    const goal = answerOf(0, 1, "placed", "goal");
    let deepest = 0;
    for (let t = KICK_AT; t < 4; t += 0.01) {
      const [, y, z] = ballPosition(t, goal);
      deepest = Math.max(deepest, backNetZ(y) - z);
    }
    expect(deepest).toBeGreaterThan(0.4);
    const [, y, z] = ballPosition(4, goal);
    expect(z).toBeGreaterThan(backNetZ(y));
  });

  it("top çizgiyi geçene kadar geriye sıçramaz", () => {
    const goal = answerOf(2, 2, "power", "goal");
    let previous = SPOT_Z;
    for (let t = KICK_AT; t <= KICK_AT + flightTime("power") + 0.2; t += 0.01) {
      const z = ballPosition(t, goal)[2];
      expect(z).toBeLessThanOrEqual(previous + 1e-6);
      previous = z;
    }
  });
});
