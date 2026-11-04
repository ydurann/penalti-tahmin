"use client";

import { useEffect, useState } from "react";
import { weekNumber } from "@/game/challenge";
import type { RegionFilter } from "@/game/regions";
import type { ChallengeStatus, LeaderboardEntry } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import type { Translate } from "@/i18n";
import styles from "./Game.module.css";
import { GlobeIcon } from "./Icons";
import { LeaderboardTable, type BoardRow } from "./LeaderboardTable";
import { RegionTabs } from "./RegionTabs";

interface ChallengeBoardProps {
  token: string;
  initialRegion?: RegionFilter;
  refresh?: number;
}

export const challengeRow = (t: Translate, entry: LeaderboardEntry): BoardRow => ({
  rank: entry.rank,
  name: entry.name,
  region: entry.region,
  detail: entry.finished ? undefined : t("board.playing"),
  score: entry.score,
  you: entry.you,
});

/** Bu haftanın challenge sıralaması; girişin sağ panelinde durur. */
export function ChallengeBoard({ token, initialRegion = "world", refresh = 0 }: ChallengeBoardProps) {
  const t = useT();
  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [status, setStatus] = useState<ChallengeStatus | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      fetch(`/api/challenge?token=${encodeURIComponent(token)}&region=${region}`)
        .then((r) => (r.ok ? (r.json() as Promise<ChallengeStatus>) : null))
        .then((data) => {
          if (active && data) setStatus(data);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, region, refresh]);

  return (
    <section className={styles.boardSection} aria-labelledby="challenge-board-title">
      <h2 id="challenge-board-title">
        <GlobeIcon /> {t("board.challengeTitle")}{" "}
        <span>
          {status
            ? `${t("board.week", { n: weekNumber(status.week.key) })} · ${t("common.players", { n: status.participants })}`
            : ""}
        </span>
      </h2>
      <RegionTabs value={region} onChange={setRegion} label={t("board.regionFilterChallenge")} />
      {status && (
        <LeaderboardTable
          rows={status.leaderboard.map((entry) => challengeRow(t, entry))}
          yourRow={status.you ? challengeRow(t, status.you) : null}
          region={region}
          scoreLabel={t("common.score")}
          emptyText={t("board.challengeEmpty")}
        />
      )}
      {status && !status.played && <p className={styles.note}>{t("board.challengeNotPlayed")}</p>}
    </section>
  );
}
