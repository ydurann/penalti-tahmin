"use client";

import { useState } from "react";
import manifest from "@/data/logos.manifest.json";
import { countryCode } from "@/game/countries";
import { teamInitials, teamSlug } from "@/game/teams";
import styles from "./Game.module.css";

const LOGOS = manifest as Record<string, string>;

interface TeamBadgeProps {
  name: string;
  /** Piksel; varsayılan 40. */
  size?: number;
}

/**
 * Takım rozeti, sırayla: `public/logos/` içindeki logo; milli takımsa `public/flags/`
 * içindeki bayrak (flag-icons, MIT); hiçbiri yoksa ya da yüklenemezse baş harfli daire.
 */
export function TeamBadge({ name, size = 40 }: TeamBadgeProps) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const logo = LOGOS[teamSlug(name)];
  const code = countryCode(name);
  const fail = (src: string) => setFailed((s) => new Set(s).add(src));

  if (logo && !failed.has("logo")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- yerel dosya, boyutu sabit
      <img
        className={styles.teamLogo}
        style={{ width: size, height: size }}
        src={`/logos/${logo}`}
        alt={`${name} logosu`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => fail("logo")}
      />
    );
  }
  if (code && !failed.has("flag")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- yerel SVG, boyutu sabit
      <img
        className={styles.teamFlag}
        style={{ width: size, height: Math.round(size * 0.75) }}
        src={`/flags/${code}.svg`}
        alt={`${name} bayrağı`}
        width={size}
        height={Math.round(size * 0.75)}
        loading="lazy"
        onError={() => fail("flag")}
      />
    );
  }
  return (
    <span
      className={styles.teamInitials}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
      aria-label={name}
    >
      {teamInitials(name)}
    </span>
  );
}
