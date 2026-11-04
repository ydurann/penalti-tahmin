"use client";

import { useEffect, useState } from "react";
import { regionName } from "@/game/labels";
import type { RegionFilter } from "@/game/regions";
import type { SoloEntry, SoloStatus } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import type { Translate } from "@/i18n";
import styles from "./Game.module.css";
import { TrophyIcon } from "./Icons";
import { LeaderboardTable, type BoardRow } from "./LeaderboardTable";
import { RegionTabs } from "./RegionTabs";

interface SoloBoardProps {
  token: string;
  /** Açılışta seçili sekme; oyuncunun bölgesi ya da dünya. */
  initialRegion?: RegionFilter;
  /** Her artışta tablo yeniden çekilir (oyun bitince). */
  refresh?: number;
  /** Yalnızca senin satırın (bitiş ekranı). */
  compact?: boolean;
}

const toRow = (t: Translate, entry: SoloEntry): BoardRow => ({
  rank: entry.rank,
  name: entry.name,
  region: entry.region,
  detail: t("common.games", { n: entry.games }),
  score: entry.total,
  you: entry.you,
});

/** Tek kişilik toplam puan sıralaması: Dünya ve bölge sekmeleri, ilk 100, senin sıran. */
export function SoloBoard({ token, initialRegion = "world", refresh = 0, compact = false }: SoloBoardProps) {
  const t = useT();
  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [status, setStatus] = useState<SoloStatus | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      fetch(`/api/leaderboard?token=${encodeURIComponent(token)}&region=${region}`)
        .then((r) => (r.ok ? (r.json() as Promise<SoloStatus>) : null))
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

  if (compact) {
    return status?.you ? (
      <p className={styles.note}>
        {t("finish.soloRank", {
          total: status.you.total,
          region: regionName(t, region),
          rank: status.you.rank,
          players: status.players,
        })}
      </p>
    ) : null;
  }

  const rows = status?.leaderboard.map((entry) => toRow(t, entry)) ?? [];
  const yourRow = status?.you ? toRow(t, status.you) : null;

  return (
    <section className={styles.boardSection} aria-labelledby="solo-board-title">
      <h2 id="solo-board-title">
        <TrophyIcon /> {t("board.solo")}{" "}
        <span>
          {t("board.totalPoints")}
          {status && ` · ${t("common.players", { n: status.players })}`}
        </span>
      </h2>
      <RegionTabs value={region} onChange={setRegion} label={t("board.regionFilterSolo")} />
      {status && (
        <LeaderboardTable
          rows={rows}
          yourRow={yourRow}
          region={region}
          scoreLabel={t("common.score")}
          emptyText={t("board.soloEmpty")}
        />
      )}
    </section>
  );
}
