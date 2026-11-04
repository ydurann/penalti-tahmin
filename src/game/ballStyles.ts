/**
 * Turnuvaya özel top görünümü. Resmî top tasarımları marka hakkıyla korunduğu için bire bir
 * kopyalanmaz; her turnuvanın topunu çağrıştıran renk düzeni ve desen kullanılır. Doku
 * `createBallTextures` ile tuvalde üretilir (kesik ikosahedron: 12 beşgen, 20 altıgen).
 */
export interface BallStyle {
  /** Doku önbelleği için anahtar. */
  id: string;
  /** Altıgen panel rengi (topun zemini). */
  hex: string;
  /** Beşgen panellerin renkleri; beşgen sırasına göre döner. */
  pentagons: string[];
  /** Beşgenlerin çevresindeki renkli halka; yoksa düz geçiş. */
  ring?: { colors: string[]; width: number };
  /** Beşgen içine piksel mozaiği (gri tonlar) bindirir. */
  mosaic?: boolean;
  seam: string;
}

const CLASSIC: BallStyle = {
  id: "classic",
  hex: "#f0f0f0",
  pentagons: ["#1a1a1a"],
  seam: "#464646",
};

/** Turnuva + sezon → stil; bulunamazsa yalnızca turnuvaya, o da yoksa klasik top. */
const STYLES: Record<string, BallStyle> = {
  "FIFA World Cup|2018": {
    id: "wc2018",
    hex: "#f4f4f4",
    pentagons: ["#2a2a2a", "#4a4a4a", "#333333"],
    mosaic: true,
    seam: "#3a3a3a",
  },
  "FIFA World Cup|2022": {
    id: "wc2022",
    hex: "#f6f6f6",
    pentagons: ["#1f5fd6", "#e6452b", "#f2a51d", "#2e8bd9", "#d9336b", "#f2a51d"],
    ring: { colors: ["#111111"], width: 0.028 },
    seam: "#6b6b6b",
  },
  "UEFA Euro|2020": {
    id: "euro2020",
    hex: "#f5f5f5",
    pentagons: ["#141414"],
    ring: { colors: ["#ff3d8d", "#2f6df6", "#ffd23f"], width: 0.07 },
    seam: "#333333",
  },
  "UEFA Euro|2024": {
    id: "euro2024",
    hex: "#f7f7f7",
    pentagons: ["#ff6a13", "#1d9bf0", "#2ec27e", "#111111"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Copa America|2024": {
    id: "copa2024",
    hex: "#f5f5f5",
    pentagons: ["#0b3d91", "#f7c948", "#0b3d91", "#2ec27e"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "African Cup of Nations|2023": {
    id: "afcon2023",
    hex: "#f5f5f5",
    pentagons: ["#f26b1d", "#1a8f3c", "#f26b1d", "#111111"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Women's World Cup": {
    id: "wwc",
    hex: "#f6f6f6",
    pentagons: ["#1e3a8a", "#0ea5e9", "#22c55e"],
    ring: { colors: ["#111111"], width: 0.028 },
    seam: "#444444",
  },
  "UEFA Women's Euro": {
    id: "weuro",
    hex: "#f6f6f6",
    pentagons: ["#7c3aed", "#ec4899", "#111111"],
    ring: { colors: ["#111111"], width: 0.028 },
    seam: "#444444",
  },
  Bundesliga: {
    id: "bundesliga",
    hex: "#f6f6f6",
    pentagons: ["#e8511b", "#111111", "#e8511b", "#2e2e2e"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Süper Lig": {
    id: "superlig",
    hex: "#f6f6f6",
    pentagons: ["#d9242b", "#111111", "#1c3f94", "#d9242b"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Premier League": {
    id: "premierleague",
    hex: "#f6f6f6",
    pentagons: ["#3d195b", "#e90052", "#3d195b", "#04f5ff"],
    ring: { colors: ["#3d195b"], width: 0.03 },
    seam: "#444444",
  },
  "Serie A": {
    id: "seriea",
    hex: "#f6f6f6",
    pentagons: ["#1e3a8a", "#f26b1d", "#1e3a8a", "#111111"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  Eredivisie: {
    id: "eredivisie",
    hex: "#f6f6f6",
    pentagons: ["#f47a1f", "#111111", "#f47a1f", "#2e2e2e"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Ligue 1": {
    id: "ligue1",
    hex: "#f6f6f6",
    pentagons: ["#0a2a66", "#d9242b", "#0a2a66", "#f2c200"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
  "Champions League": {
    id: "ucl",
    hex: "#f6f6f6",
    pentagons: ["#0a2a66"],
    ring: { colors: ["#ffffff"], width: 0.045 },
    seam: "#2a3a66",
  },
  "Europa League": {
    id: "uel",
    hex: "#f6f6f6",
    pentagons: ["#f26b1d", "#111111", "#f26b1d", "#2e2e2e"],
    ring: { colors: ["#111111"], width: 0.03 },
    seam: "#444444",
  },
};

export function ballStyleFor(match?: { competition: string; season: string } | null): BallStyle {
  if (!match) return CLASSIC;
  return STYLES[`${match.competition}|${match.season}`] ?? STYLES[match.competition] ?? CLASSIC;
}

export const CLASSIC_BALL = CLASSIC;
