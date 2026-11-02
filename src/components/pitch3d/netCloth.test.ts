import { describe, expect, it } from "vitest";
import { createCloth, type Point3 } from "./netCloth";

const COLUMNS = 30;
const ROWS = 14;
const WIDTH = 7.32;
const HEIGHT = 2.44;

const point = (column: number, row: number): Point3 => [
  -WIDTH / 2 + (column / COLUMNS) * WIDTH,
  (row / ROWS) * HEIGHT,
  -1.5,
];
const pinned = (column: number, row: number) =>
  row === 0 || row === ROWS || column === 0 || column === COLUMNS;

const nodeAt = (column: number, row: number) => (row * (COLUMNS + 1) + column) * 3;
const make = () => createCloth(COLUMNS, ROWS, point, pinned);

describe("createCloth", () => {
  it("kenarlar yerinde kalır, orta kısım yerçekimiyle sarkar", () => {
    const cloth = make();
    const corner = nodeAt(0, ROWS);
    expect(cloth.positions[corner]).toBeCloseTo(-WIDTH / 2, 5);
    expect(cloth.positions[corner + 1]).toBeCloseTo(HEIGHT, 5);

    const center = nodeAt(15, 7);
    const sag = point(15, 7)[1] - cloth.positions[center + 1];
    expect(sag).toBeGreaterThan(0.001);
    expect(sag).toBeLessThan(0.3);
  });

  it("top fileyi iter, file esner ve top gidince geri toplanır", () => {
    const cloth = make();
    const center = nodeAt(15, 7);
    const restZ = cloth.positions[center + 2];

    let deepest = restZ;
    // Top önden gelir, gerçek vuruştaki gibi her adımda yarıçapından az ilerler.
    for (let i = 0; i < 60; i++) {
      cloth.step({ x: 0, y: 1.22, z: -1.1 - (i / 60) * 1.0, radius: 0.17 });
      deepest = Math.min(deepest, cloth.positions[center + 2]);
    }
    expect(restZ - deepest).toBeGreaterThan(0.35);

    const neighbor = cloth.positions[nodeAt(18, 7) + 2];
    expect(restZ - neighbor).toBeGreaterThan(0.05);

    for (let i = 0; i < 600; i++) cloth.step(null);
    expect(Math.abs(cloth.positions[center + 2] - restZ)).toBeLessThan(0.08);
  });

  it("sert çarpmalarda sayılar bozulmaz, kenarlar kopmaz", () => {
    const cloth = make();
    for (let i = 0; i < 200; i++) {
      cloth.step({ x: Math.sin(i) * 3, y: 1.2, z: -1.5 - Math.abs(Math.sin(i * 0.3)), radius: 0.3 });
    }
    expect(cloth.positions.every(Number.isFinite)).toBe(true);
    expect(cloth.positions[nodeAt(COLUMNS, 0)]).toBeCloseTo(WIDTH / 2, 5);
  });

  it("reset dinlenme haline döndürür", () => {
    const cloth = make();
    const rest = cloth.positions.slice();
    cloth.step({ x: 0, y: 1.22, z: -1.6, radius: 0.3 });
    expect(cloth.positions).not.toEqual(rest);
    cloth.reset();
    expect(cloth.positions).toEqual(rest);
  });
});
