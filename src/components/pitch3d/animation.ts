import type { PenaltyAnswer, ShotType, Zone } from "@/game/types";

// Tüm uzunluklar metre, süreler saniye. Kale çizgisi z=0, penaltı noktası z=11.
// Bu modül three.js'e bağlı değildir; oyun ekranı süreyi buradan okur.
export type Vec3 = [x: number, y: number, z: number];

export const GOAL = { width: 7.32, height: 2.44 };
export const SPOT_Z = 11;
export const BALL_RADIUS = 0.14;
export const KEEPER_Z = 0.45;
/** Koşunun bitip topa vurulduğu an; penaltıcı hareketinde ayağın topa değdiği kareyle aynı. */
export const KICK_AT = 0.75;

/**
 * Topun 11 metreyi aldığı süre: sert ~130 km/sa (0,30 sn), plase ~55 km/sa (0,72 sn), panenka
 * ~40 km/sa. Fark bilerek büyük tutuldu; sert vuruş ekranda belli olsun.
 */
const FLIGHT: Record<ShotType, number> = { power: 0.3, placed: 0.72, panenka: 1.0 };
const ARC: Record<ShotType, number> = { power: 0.08, placed: 0.4, panenka: 1.3 };
const SETTLE = 0.6;
const NET_HIT_TIME = 0.12;
const NET_PUSH_TIME = 0.16;
const NET_PUSH_DEPTH = 0.45;
const NET_RELEASE_TIME = 0.4;
const NET_REST_GAP = 0.12;
const REBOUND_TIME = 0.7;
/** Kaçan topun direğin ya da üst direğin dışından geçtiği boşluk. */
const MISS_GAP = 0.55;
/** Kaçan topun çizgiyi geçtikten sonra gittiği derinlik ve bunun süresi. */
const MISS_RUN = 6;
const MISS_RUN_TIME = 0.5;

export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export const flightTime = (shot: ShotType) => FLIGHT[shot];

/** Sonuç ekranı açılmadan önce vuruşun bitmesi için beklenen süre. */
export function shotDurationMs(answer: PenaltyAnswer): number {
  return Math.round((KICK_AT + FLIGHT[answer.shot] + SETTLE) * 1000);
}

export function zoneCenter({ col, row }: Zone): [x: number, y: number] {
  return [
    (col - 1) * (GOAL.width / 3),
    GOAL.height - (row + 0.5) * (GOAL.height / 3),
  ];
}

/** Filenin arka yüzünün verilen yükseklikteki z konumu. */
export const backNetZ = (y: number) => -2 + (y / GOAL.height) * 1.1;

/**
 * Kaçan topun kale çizgisini geçtiği nokta: üst satırda (ya da orta sütunda) üst direğin
 * üstü, yoksa bölgenin yüksekliğinde direğin dışı.
 */
export function missPoint(answer: PenaltyAnswer): [x: number, y: number] {
  const [x, y] = zoneCenter(answer.zone);
  if (answer.zone.row === 0 || answer.zone.col === 1) return [x, GOAL.height + MISS_GAP];
  return [Math.sign(x) * (GOAL.width / 2 + MISS_GAP), y];
}

/** "Dışarı" seçiminin sahnede işaretlendiği yer: üst direğin üstü, ortada. */
export const outPoint = (): [x: number, y: number] => [0, GOAL.height + MISS_GAP];

/** Topun kale çizgisine (kurtarışta kalecinin önüne) vardığı nokta. */
export function targetPoint(answer: PenaltyAnswer): [x: number, y: number] {
  return answer.outcome === "missed" ? missPoint(answer) : zoneCenter(answer.zone);
}

/** Topa vurulduktan `t` saniye sonraki değil, vuruş başladıktan `t` saniye sonraki konum. */
export function ballPosition(t: number, answer: PenaltyAnswer): Vec3 {
  const [tx, ty] = targetPoint(answer);
  const saved = answer.outcome === "saved";
  const flight = FLIGHT[answer.shot];
  const arrivalZ = saved ? KEEPER_Z : 0;

  if (t <= KICK_AT) return [0, BALL_RADIUS, SPOT_Z];

  const u = (t - KICK_AT) / flight;
  if (u <= 1) {
    return [
      lerp(0, tx, u),
      lerp(BALL_RADIUS, ty, u) + ARC[answer.shot] * 4 * u * (1 - u),
      lerp(SPOT_Z, arrivalZ, u),
    ];
  }

  const after = t - KICK_AT - flight;
  if (answer.outcome === "missed") {
    // Top aynı doğrultuda kalenin arkasına süzülür, yere düşer ve orada kalır.
    const run = easeOut(clamp01(after / MISS_RUN_TIME));
    const fall = Math.min(after, 1.5);
    const y = Math.max(BALL_RADIUS, ty + 0.6 * fall - 4.9 * fall * fall);
    return [tx * (1 + 0.3 * run), y, -MISS_RUN * run];
  }
  if (saved) {
    const a = clamp01(after / REBOUND_TIME);
    const height = (ty - BALL_RADIUS) * (1 - a) * (1 - a);
    const bounce = Math.abs(Math.sin(a * Math.PI * 2)) * 0.35 * (1 - a);
    return [tx * (1 + 0.2 * a), BALL_RADIUS + height + bounce, lerp(KEEPER_Z, 4, easeOut(a))];
  }

  // Top fileye girer, onu önüne katarak geriye esnetir, sonra file onu geri bırakır.
  const inNet = Math.max(after - NET_HIT_TIME, 0);
  const y = Math.max(BALL_RADIUS, ty - 3.2 * inNet * inNet);
  const netZ = backNetZ(y);
  if (after <= NET_HIT_TIME) return [tx, y, lerp(0, netZ, after / NET_HIT_TIME)];
  if (inNet <= NET_PUSH_TIME) return [tx, y, netZ - NET_PUSH_DEPTH * easeOut(inNet / NET_PUSH_TIME)];
  const back = easeOut(clamp01((inNet - NET_PUSH_TIME) / NET_RELEASE_TIME));
  return [tx, y, lerp(netZ - NET_PUSH_DEPTH, netZ + NET_REST_GAP, back)];
}

/** Golde topun durduğu z: filenin hemen önü. */
export const ballRestZ = (y: number) => backNetZ(y) + NET_REST_GAP;
