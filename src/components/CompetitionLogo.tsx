"use client";

import { useState, type ReactNode } from "react";
import manifest from "@/data/logos.manifest.json";
import { teamSlug } from "@/game/teams";
import styles from "./Game.module.css";

const LOGOS = manifest as Record<string, string>;

interface CompetitionLogoProps {
  competition: string;
  /** Verilirse önce sezona özel logo aranır (Dünya Kupası 2018 ile 2022 farklıdır). */
  season?: string;
  /** Piksel yükseklik; genişlik orana göre. Varsayılan 20. */
  height?: number;
  /** Logo yoksa ya da yüklenemezse gösterilecek içerik. */
  fallback?: ReactNode;
}

/** Manifest anahtarı: `competition-<turnuva>[-<sezon>]`, örn. `competition-fifa-world-cup-2022`. */
export function competitionLogoFile(competition: string, season?: string): string | undefined {
  const base = `competition-${teamSlug(competition)}`;
  return (season ? LOGOS[`${base}-${teamSlug(season)}`] : undefined) ?? LOGOS[base];
}

/**
 * Turnuva logosu: `public/logos/competition-<slug>[-<sezon>].png|svg` dosyası (ör. "Süper Lig" →
 * `competition-super-lig.png`, "FIFA World Cup" 2022 → `competition-fifa-world-cup-2022.png`);
 * manifestte yoksa `fallback`. Lig logoları yatay olduğundan yükseklik sabitlenir, genişlik
 * serbest kalır.
 */
export function CompetitionLogo({ competition, season, height = 20, fallback = null }: CompetitionLogoProps) {
  const [failed, setFailed] = useState(false);
  const logo = competitionLogoFile(competition, season);
  if (!logo || failed) return <>{fallback}</>;
  return (
    // Dikey logolar yüksekliğe, yatay logolar genişliğe (yüksekliğin 2,2 katı) sığar.
    // eslint-disable-next-line @next/next/no-img-element -- yerel dosya, boyutu sabit
    <img
      className={styles.competitionLogo}
      style={{ maxHeight: height, maxWidth: Math.round(height * 2.2) }}
      src={`/logos/${logo}`}
      alt={`${competition} logosu`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
