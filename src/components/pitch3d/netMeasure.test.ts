import { describe, expect, it } from "vitest";
import type { Index, PenaltyAnswer, ShotType } from "@/game/types";
import { BALL_RADIUS, ballPosition, flightTime, GOAL, KICK_AT } from "./animation";
import { CLOTH_STEP, createGoalNetCloth } from "./netCloth";

const COLUMNS = 44;
const BACK_ROWS = 15;

const CASES: [Index, Index, ShotType][] = [
  [2, 0, "power"],
  [0, 1, "placed"],
  [1, 1, "panenka"],
  [2, 2, "placed"],
  [0, 0, "placed"],
];

describe("gerçek kale filesi", () => {
  it("dinlenirken az sarkar", () => {
    const { positions, count } = createGoalNetCloth();
    let sag = 0;
    for (let n = 0; n < count; n++) {
      const row = Math.floor(n / (COLUMNS + 1));
      if (row > BACK_ROWS) continue;
      sag = Math.max(sag, (row / BACK_ROWS) * GOAL.height - positions[n * 3 + 1]);
    }
    expect(sag).toBeGreaterThan(0.005);
    expect(sag).toBeLessThan(0.2);
  });

  it.each(CASES)("bölge %i-%i, %s: top fileyi şişirir, savurmaz, file geri toplanır", (col, row, shot) => {
    const cloth = createGoalNetCloth();
    const rest = cloth.positions.slice();
    const answer: PenaltyAnswer = { zone: { col, row }, shot, outcome: "goal", keeperDive: 1 };
    const start = KICK_AT + flightTime(shot);

    const bulge = () => {
      let max = 0;
      for (let n = 0; n < cloth.count; n++) {
        max = Math.max(max, rest[n * 3 + 2] - cloth.positions[n * 3 + 2]);
      }
      return max;
    };

    let peak = 0;
    for (let t = start; t < start + 3; t += CLOTH_STEP) {
      const [x, y, z] = ballPosition(t, answer);
      cloth.step({ x, y, z, radius: BALL_RADIUS + 0.03 });
      peak = Math.max(peak, bulge());
    }

    expect(cloth.positions.every(Number.isFinite)).toBe(true);
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThan(0.85);
    expect(bulge()).toBeLessThan(0.3);
  });
});
