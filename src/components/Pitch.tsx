import type { BallStyle } from "@/game/ballStyles";
import { targetLabel, zoneLabel } from "@/game/labels";
import type { Index, PenaltyAnswer, ShotType, Target, Zone } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import styles from "./Game.module.css";

const INDEXES: Index[] = [0, 1, 2];

// SVG viewBox ile bölge butonlarının yüzdeleri aynı geometriyi paylaşır.
const GOAL = { x: 120, y: 40, width: 400, height: 200 };
const SPOT = { x: 320, y: 312 };
const FLIGHT_SECONDS: Record<ShotType, number> = { power: 0.4, placed: 0.65, panenka: 1.05 };
/** Kaçan topun kale çerçevesinin ne kadar dışına gittiği. */
const MISS_GAP = 28;

function zoneCenter({ col, row }: Zone) {
  return {
    x: GOAL.x + (GOAL.width / 3) * (col + 0.5),
    y: GOAL.y + (GOAL.height / 3) * (row + 0.5),
  };
}

/** Kaçan top üst satırda üst direğin üstünden, yoksa direğin yanından geçer. */
function targetPoint(answer: PenaltyAnswer) {
  const point = zoneCenter(answer.zone);
  if (answer.outcome !== "missed") return point;
  if (answer.zone.row === 0 || answer.zone.col === 1) return { x: point.x, y: GOAL.y - MISS_GAP };
  return { x: answer.zone.col === 0 ? GOAL.x - MISS_GAP : GOAL.x + GOAL.width + MISS_GAP, y: point.y };
}

const sameZone = (a: Target | null, b: Zone | null | undefined) =>
  !!a && a !== "out" && !!b && a.col === b.col && a.row === b.row;

interface PitchProps {
  selected: Target | null;
  /** Vuruş başladığında dolu olur; top ve kaleci buna göre hareket eder. */
  shot: PenaltyAnswer | null;
  /** Animasyon bitince gerçek bölgeyi vurgular. */
  revealZone: boolean;
  disabled: boolean;
  /** Turnuvaya özel top; 2D sahada yalnızca beşgen rengi kullanılır. */
  ball: BallStyle;
  onSelect: (target: Target) => void;
}

const classes = (...names: (string | false)[]) => names.filter(Boolean).join(" ");

export function Pitch({ selected, shot, revealZone, disabled, ball, onSelect }: PitchProps) {
  const t = useT();
  const target = shot && targetPoint(shot);
  const ballStyle = target
    ? {
        transform: `translate(${target.x - SPOT.x}px, ${target.y - SPOT.y}px) scale(0.6)`,
        transition: `transform ${FLIGHT_SECONDS[shot.shot]}s cubic-bezier(.2,.7,.3,1)`,
      }
    : undefined;
  const keeperStyle = shot
    ? {
        transform:
          shot.keeperDive === 1
            ? "translateY(-8px)"
            : `translate(${(shot.keeperDive - 1) * 115}px, 12px) rotate(${(shot.keeperDive - 1) * 62}deg)`,
        transition: "transform .5s cubic-bezier(.2,.7,.3,1)",
      }
    : undefined;

  const outSelected = selected === "out";
  const outReal = revealZone && shot?.outcome === "missed";

  return (
    <div className={styles.pitch}>
      <svg viewBox="0 0 640 360" className={styles.pitchSvg} aria-hidden="true">
        <rect width="640" height="360" fill="#2f6b34" />
        {[0, 2, 4, 6].map((n) => (
          <rect key={n} x={n * 91.5} width="91.5" height="360" fill="#35763a" />
        ))}
        <rect y="240" width="640" height="2" fill="#ffffff" opacity="0.8" />
        <path d="M40 240 L40 340 L600 340 L600 240" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
        <rect {...GOAL} fill="#1d3f22" fillOpacity="0.55" />
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <line key={`v${n}`} x1={GOAL.x + n * 40} x2={GOAL.x + n * 40} y1={GOAL.y} y2={GOAL.y + GOAL.height} stroke="#fff" strokeOpacity="0.14" />
        ))}
        {[1, 2, 3, 4].map((n) => (
          <line key={`h${n}`} x1={GOAL.x} x2={GOAL.x + GOAL.width} y1={GOAL.y + n * 40} y2={GOAL.y + n * 40} stroke="#fff" strokeOpacity="0.14" />
        ))}
        <rect {...GOAL} fill="none" stroke="#ffffff" strokeWidth="7" />

        <g className={styles.keeper} style={keeperStyle}>
          <rect x="304" y="150" width="32" height="56" rx="8" fill="#f2b632" />
          <rect x="285" y="154" width="20" height="9" rx="4" fill="#f2b632" />
          <rect x="335" y="154" width="20" height="9" rx="4" fill="#f2b632" />
          <circle cx="280" cy="158" r="7" fill="#ffffff" />
          <circle cx="360" cy="158" r="7" fill="#ffffff" />
          <circle cx="320" cy="136" r="12" fill="#e8c4a0" />
          <rect x="307" y="204" width="11" height="32" rx="4" fill="#23272e" />
          <rect x="322" y="204" width="11" height="32" rx="4" fill="#23272e" />
        </g>

        <circle cx={SPOT.x} cy={SPOT.y + 14} r="3" fill="#ffffff" />
        <g className={styles.ball} style={ballStyle}>
          <circle cx={SPOT.x} cy={SPOT.y} r="12" fill={ball.hex} stroke={ball.seam} strokeWidth="1.5" />
          <circle cx={SPOT.x} cy={SPOT.y} r="4" fill={ball.pentagons[0]} />
        </g>
      </svg>

      {/* "Dışarı" üç şerit: üst, sol, sağ; hepsi aynı hedef. */}
      {[
        ["top", styles.outTopFixed],
        ["left", `${styles.outLeftFixed} ${styles.outSide} ${styles.outLeft}`],
        ["right", `${styles.outRightFixed} ${styles.outSide}`],
      ].map(([key, extra]) => (
        <button
          key={key}
          type="button"
          className={classes(
            styles.outZone,
            extra,
            outSelected && styles.zoneSelected,
            outReal && styles.zoneReal,
            outReal && outSelected && styles.zoneHit,
          )}
          disabled={disabled}
          aria-pressed={outSelected}
          aria-label={targetLabel(t, "out")}
          onClick={() => onSelect("out")}
        >
          {t("zone.out")}
        </button>
      ))}
      <div className={styles.zones}>
        {INDEXES.flatMap((row) =>
          INDEXES.map((col) => {
            const zone: Zone = { col, row };
            const isSelected = sameZone(selected, zone);
            const isReal = revealZone && shot?.outcome !== "missed" && sameZone(zone, shot?.zone);
            return (
              <button
                key={`${col}-${row}`}
                type="button"
                className={classes(
                  styles.zone,
                  isSelected && styles.zoneSelected,
                  isReal && styles.zoneReal,
                  isReal && isSelected && styles.zoneHit,
                )}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={zoneLabel(t, zone)}
                onClick={() => onSelect(zone)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
