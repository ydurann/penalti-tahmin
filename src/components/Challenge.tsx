"use client";

import { useCallback, useEffect, useState } from "react";
import { weekNumber } from "@/game/challenge";
import { regionName } from "@/game/labels";
import type { RegionFilter, RegionId } from "@/game/regions";
import type { ChallengeStartRequest, ChallengeStatus, NewGameResponse } from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import type { Translate } from "@/i18n";
import { errorText, post } from "./api";
import { challengeRow } from "./ChallengeBoard";
import styles from "./Game.module.css";
import { BackIcon, GlobeIcon, PlayIcon } from "./Icons";
import { LeaderboardTable } from "./LeaderboardTable";
import { RegionTabs } from "./RegionTabs";

/** Kalan süre: "3 gün 4 saat" ya da "5 saat 12 dakika". */
function remainingText(t: Translate, endsAt: number, now: number): string {
  const left = Math.max(endsAt - now, 0);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  if (d > 0) return t("challenge.days", { d, h });
  if (h > 0) return t("challenge.hours", { h, m });
  return t("challenge.minutes", { m });
}

interface ChallengeProps {
  token: string;
  /** Ana sayfada girilen ad ve bölge; burada yeniden sorulmaz. */
  name: string;
  region: RegionId;
  onStart: (game: NewGameResponse) => void;
  onBack: () => void;
}

/** Haftalık challenge ekranı: bilgi, bölge sekmeli sıralama ve (oynanmadıysa) başlatma. */
export function Challenge({ token, name, region, onStart, onBack }: ChallengeProps) {
  const t = useT();
  const [tab, setTab] = useState<RegionFilter>(region);
  const [status, setStatus] = useState<ChallengeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/challenge?token=${encodeURIComponent(token)}&region=${tab}`);
      if (!response.ok) throw new Error("load");
      setStatus((await response.json()) as ChallengeStatus);
    } catch {
      setError(t("challenge.loadFailed"));
    }
  }, [token, tab, t]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: ChallengeStartRequest = { token, name, region };
      onStart(await post<NewGameResponse>("/api/challenge/start", body));
    } catch (e) {
      setError(errorText(t, e));
      setBusy(false);
    }
  };

  return (
    <main className={styles.intro}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>{t("challenge.eyebrow")}</span>
        <h1>{status ? t("board.week", { n: weekNumber(status.week.key) }) : t("common.loading")}</h1>
        <p>
          {t("challenge.description")}
          {status && ` ${t("challenge.endsIn", { time: remainingText(t, status.week.endsAt, status.serverNow) })}`}
        </p>
        <p className={styles.identity}>
          <strong>{name}</strong> · {regionName(t, region)}
          <button className={styles.linkBtn} onClick={onBack}>{t("common.change")}</button>
        </p>

        {status && !status.played && (
          <button className={styles.start} disabled={busy} onClick={() => void start()}>
            <PlayIcon />
            {busy ? t("common.preparing") : t("challenge.start")}
          </button>
        )}

        {status?.played && (
          <div className={styles.yourRank}>
            <GlobeIcon />
            <div>
              <strong>
                {status.you
                  ? t("challenge.rankLine", { region: regionName(t, tab), rank: status.you.rank, score: status.you.score })
                  : t("challenge.otherRegion")}
              </strong>
              <span>{status.you?.finished === false ? t("challenge.unfinished") : t("challenge.used")}</span>
            </div>
          </div>
        )}

        <section className={styles.boardSection} aria-labelledby="board-title">
          <h2 id="board-title">
            {t("challenge.ranking")} <span>{status && t("common.players", { n: status.participants })}</span>
          </h2>
          <RegionTabs value={tab} onChange={setTab} label={t("board.regionFilterChallenge")} />
          {status && (
            <LeaderboardTable
              rows={status.leaderboard.map((entry) => challengeRow(t, entry))}
              yourRow={status.you ? challengeRow(t, status.you) : null}
              region={tab}
              scoreLabel={t("common.score")}
              emptyText={t("challenge.rankingEmpty")}
            />
          )}
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.linkBtn} onClick={onBack}>
          <BackIcon /> {t("common.back")}
        </button>
      </div>
    </main>
  );
}
