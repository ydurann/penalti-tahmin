"use client";

import { regionName } from "@/game/labels";
import type { RegionFilter, RegionId } from "@/game/regions";
import { useT } from "@/i18n/LocaleProvider";
import styles from "./Game.module.css";

export interface BoardRow {
  rank: number;
  name: string;
  region: RegionId;
  /** Puanın yanındaki kısa bilgi: "14 oyun" ya da "oynuyor". */
  detail?: string;
  score: number;
  you: boolean;
}

interface LeaderboardTableProps {
  rows: BoardRow[];
  /** Senin satırın; verilirse listede olsan da olmasan da tablonun altına sabitlenir. */
  yourRow?: BoardRow | null;
  /** Dünya görünümünde bölge sütunu gösterilir. */
  region: RegionFilter;
  scoreLabel: string;
  emptyText: string;
}

/**
 * Kaydırılabilir, sabit başlıklı sıralama tablosu. Oyuncunun kendi satırı sarıdır ve tablonun
 * altına sabitlenir; böylece 1987. sırada bile olsa sırasını hep görür.
 */
export function LeaderboardTable({ rows, yourRow, region, scoreLabel, emptyText }: LeaderboardTableProps) {
  const t = useT();
  const showRegion = region === "world";
  const columns = showRegion ? 4 : 3;
  const cells = (row: BoardRow) => (
    <>
      <td className={styles.colRank}>{row.rank}</td>
      <td className={styles.colName}>
        {row.name}
        {row.you && <span className={styles.youTag}>{t("common.you")}</span>}
        {row.detail && <small>{row.detail}</small>}
      </td>
      {showRegion && <td className={styles.colRegion}>{regionName(t, row.region)}</td>}
      <td className={styles.colScore}>{row.score}</td>
    </>
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.board}>
        <thead>
          <tr>
            <th className={styles.colRank}>#</th>
            <th className={styles.colName}>{t("common.player")}</th>
            {showRegion && <th className={styles.colRegion}>{t("common.region")}</th>}
            <th className={styles.colScore}>{scoreLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns} className={styles.emptyCell}>{emptyText}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.rank} className={row.you ? styles.rowMe : undefined}>
                {cells(row)}
              </tr>
            ))
          )}
        </tbody>
        {yourRow && (
          <tfoot>
            <tr className={styles.rowPinned}>{cells(yourRow)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
