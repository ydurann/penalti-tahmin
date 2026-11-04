/**
 * GoalSpot markası: işaret (kale çerçevesi + 3×3 ağ + sağ alt bölgede altın "spot") ve
 * iki renkli yazı ("Goal" açık, "Spot" altın). Bu dosya hem React DOM'da hem `next/og`
 * ImageResponse (satori) içinde kullanılır; bu yüzden yalnızca düz renk, basit SVG ve
 * flex kullanılır (degrade ve filtre yok).
 */
export const BRAND = {
  name: "GoalSpot",
  /** "Goal" ve "Spot" parçaları; yazı iki renkli basılır. */
  parts: ["Goal", "Spot"] as const,
  bg: "#0b2114",
  frame: "#f3f7f4",
  net: "rgba(243,247,244,0.28)",
  spot: "#f3b623",
  spotGlow: "rgba(243,182,35,0.35)",
};

/** Kare işaret; `size` piksel. Satori ve tarayıcı aynı SVG'yi çizer. */
export function BrandMark({ size = 40, radius = 0.22 }: { size?: number; radius?: number }) {
  const r = 64 * radius;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GoalSpot">
      <rect x="0" y="0" width="64" height="64" rx={r} fill={BRAND.bg} />
      {/* Ağ: kale içinde 3×3 ızgara */}
      <path d="M26 18V45M38 18V45M14 27h36M14 36h36" stroke={BRAND.net} strokeWidth="1.6" />
      {/* Kale çerçevesi: iki direk ve üst direk */}
      <path d="M14 45V18h36v27" fill="none" stroke={BRAND.frame} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Spot: sağ alt bölge */}
      <circle cx="44" cy="39" r="9.5" fill={BRAND.spotGlow} />
      <circle cx="44" cy="39" r="5.6" fill={BRAND.spot} />
    </svg>
  );
}
