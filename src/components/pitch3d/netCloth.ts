import { backNetZ, GOAL } from "./animation";

// File için kumaş fiziği (Verlet). Düğümler yerçekimiyle sarkar, kenarları kaleye bağlıdır,
// top düğümleri önüne katarak iter. Bağlar yumuşak olduğu için file esner ve geri döner.
export const CLOTH_STEP = 1 / 120;

const GRAVITY = -9.8;
const DAMPING = 0.985;
const STIFFNESS = 0.45;
const ITERATIONS = 4;
const SETTLE_STEPS = 360;
/** Bağların boyu: file tam gergin değil, çok az bol asılır. */
const SLACK = 1.005;

export interface Sphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export type Point3 = [x: number, y: number, z: number];

export interface Cloth {
  count: number;
  /** Düğüm konumları (x, y, z sırasıyla). Çizim bu diziyi okur. */
  positions: Float32Array;
  /** Çizgi çizimi için komşu düğüm çiftleri. */
  edges: number[];
  step: (ball: Sphere | null) => void;
  reset: () => void;
}

export function createCloth(
  columns: number,
  rows: number,
  pointAt: (column: number, row: number) => Point3,
  isPinned: (column: number, row: number) => boolean,
): Cloth {
  const count = (columns + 1) * (rows + 1);
  const at = (column: number, row: number) => row * (columns + 1) + column;

  const positions = new Float32Array(count * 3);
  const previous = new Float32Array(count * 3);
  const free = new Uint8Array(count);
  const edges: number[] = [];

  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const index = at(column, row);
      positions.set(pointAt(column, row), index * 3);
      free[index] = isPinned(column, row) ? 0 : 1;
      if (column < columns) edges.push(index, at(column + 1, row));
      if (row < rows) edges.push(index, at(column, row + 1));
    }
  }
  previous.set(positions);

  const restLengths = new Float32Array(edges.length / 2);
  for (let e = 0; e < restLengths.length; e++) {
    const a = edges[e * 2] * 3;
    const b = edges[e * 2 + 1] * 3;
    restLengths[e] =
      Math.hypot(
        positions[a] - positions[b],
        positions[a + 1] - positions[b + 1],
        positions[a + 2] - positions[b + 2],
      ) * SLACK;
  }

  const step = (ball: Sphere | null) => {
    const gravityStep = GRAVITY * CLOTH_STEP * CLOTH_STEP;
    for (let n = 0; n < count; n++) {
      if (!free[n]) continue;
      for (let axis = 0; axis < 3; axis++) {
        const i = n * 3 + axis;
        const current = positions[i];
        positions[i] += (current - previous[i]) * DAMPING + (axis === 1 ? gravityStep : 0);
        previous[i] = current;
      }
    }

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      for (let e = 0; e < restLengths.length; e++) {
        const aNode = edges[e * 2];
        const bNode = edges[e * 2 + 1];
        const a = aNode * 3;
        const b = bNode * 3;
        const dx = positions[b] - positions[a];
        const dy = positions[b + 1] - positions[a + 1];
        const dz = positions[b + 2] - positions[a + 2];
        const length = Math.hypot(dx, dy, dz);
        if (length === 0) continue;

        const shift = ((length - restLengths[e]) / length) * STIFFNESS;
        const share = free[aNode] + free[bNode];
        if (share === 0) continue;
        const move = shift / share;
        if (free[aNode]) {
          positions[a] += dx * move;
          positions[a + 1] += dy * move;
          positions[a + 2] += dz * move;
        }
        if (free[bNode]) {
          positions[b] -= dx * move;
          positions[b + 1] -= dy * move;
          positions[b + 2] -= dz * move;
        }
      }
    }

    // Top önden gelir ve düğümleri yalnızca geriye iter. Yana itseydi düğümler açılır,
    // top gözeneklerin arasından geçip giderdi.
    if (ball) {
      const radiusSquared = ball.radius * ball.radius;
      for (let n = 0; n < count; n++) {
        if (!free[n]) continue;
        const i = n * 3;
        const dx = positions[i] - ball.x;
        const dy = positions[i + 1] - ball.y;
        const across = dx * dx + dy * dy;
        if (across >= radiusSquared) continue;
        const backSurface = ball.z - Math.sqrt(radiusSquared - across);
        if (positions[i + 2] > backSurface) {
          positions[i + 2] = backSurface;
          // Düğüm topla birlikte gider; topun hızını alırsa fırlayıp savrulur.
          previous[i + 2] = backSurface;
        }
      }
    }

    // Düğümler zemine girmesin.
    for (let n = 0; n < count; n++) {
      if (free[n] && positions[n * 3 + 1] < 0.01) positions[n * 3 + 1] = 0.01;
    }
  };

  for (let i = 0; i < SETTLE_STEPS; i++) step(null);
  const rest = positions.slice();
  previous.set(positions);

  const reset = () => {
    positions.set(rest);
    previous.set(rest);
  };

  return { count, positions, edges, step, reset };
}

/**
 * Arka ve üst file tek kumaştır: yerden kalkar, arkadan yükselir, üstten direğe döner.
 * Yer çizgisine, arka üst boruya, üst direğe ve yanlara bağlıdır; top ortasını iter.
 */
export function createGoalNetCloth(): Cloth {
  const columns = 44;
  const backRows = 15;
  const roofRows = 6;
  const rows = backRows + roofRows;
  const halfWidth = GOAL.width / 2;
  const topZ = backNetZ(GOAL.height);

  return createCloth(
    columns,
    rows,
    (column, row) => {
      const x = -halfWidth + (column / columns) * GOAL.width;
      if (row <= backRows) {
        const y = (row / backRows) * GOAL.height;
        return [x, y, backNetZ(y)];
      }
      return [x, GOAL.height, topZ * (1 - (row - backRows) / roofRows)];
    },
    (column, row) =>
      row === 0 || row === backRows || row === rows || column === 0 || column === columns,
  );
}
