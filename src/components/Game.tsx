"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { toggleGroup } from "@/game/competitions";
import { regionName } from "@/game/labels";
import { ROUNDS_PER_GAME } from "@/game/session";
import type {
  CompetitionOption,
  Hint,
  NewGameRequest,
  NewGameResponse,
  PublicRound,
  RoundResult,
  ShotType,
  Target,
} from "@/game/types";
import { LOCALES } from "@/i18n";
import { useLocale } from "@/i18n/LocaleProvider";
import { AdSlot } from "./AdSlot";
import { errorText, post, wait } from "./api";
import { CompetitionBar, CompetitionSheet } from "./CompetitionSheet";
import styles from "./Game.module.css";
import {
  ArrowRightIcon,
  BootIcon,
  FlagIcon,
  FlameIcon,
  HelpIcon,
  PlayIcon,
  GlobeIcon,
  ReplayIcon,
  TargetIcon,
  UsersIcon,
} from "./Icons";
import { REGIONS, type RegionId } from "@/game/regions";
import { Challenge } from "./Challenge";
import { ChallengeBoard } from "./ChallengeBoard";
import { playerToken, saveName, savedName, saveRegion, savedRegion } from "./identity";
import { Multiplayer } from "./Multiplayer";
import { shotDurationMs } from "./pitch3d/animation";
import { RoundView } from "./RoundView";
import { SoloBoard } from "./SoloBoard";
import { markTutorialSeen, Tutorial, tutorialSeen } from "./Tutorial";

type Status = "idle" | "loading" | "guessing" | "paused" | "shooting" | "revealed" | "finished";

/** Vuruş sonrası özetin ekranda kalma süresi; dolunca sıradaki penaltı kendiliğinden açılır. */
const AUTO_NEXT_MS = 15_000;

/** Oyuncu anahtarı değişmez; dış depo aboneliği boş kalır. */
const subscribeNothing = () => () => {};

interface GameProps {
  /** Girişte seçilebilen turnuvalar; kurgusal veride boştur ve seçici gösterilmez. */
  competitions?: CompetitionOption[];
  /** Giriş ekranında kartın altında gösterilen sunucu içeriği (tanıtım/SSS). */
  footer?: ReactNode;
  /**
   * Başta seçili gelecek turnuva kimlikleri ("turnuva|sezon"); lig ve oyuncu sayfalarındaki
   * "oyna" bağlantısı `?turnuva=` ile gönderir, `page.tsx` havuzdakilerle eşleyip verir.
   */
  preselected?: string[];
}

export function Game({ competitions = [], footer, preselected = [] }: GameProps) {
  const { locale, setLocale, t } = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<"single" | "multi" | "challenge">("single");
  // Bileşen sunucuda da işlenir; anahtar ve ad yalnızca tarayıcıda okunur. Sunucu anlık
  // görüntüsü boş olduğu için hidrasyon bozulmaz, değerler hemen ardından gelir.
  const token = useSyncExternalStore(subscribeNothing, playerToken, () => "");
  const [name, setName] = useState("");
  const [region, setRegion] = useState<RegionId | "">("");
  // Öğretici ilk ziyarette kendiliğinden açılır; kapatılınca bir daha çıkmaz.
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // Turnuva seçici sayfayı uzatmasın diye panelde açılır.
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setName((current) => current || savedName());
      setRegion((current) => current || savedRegion());
      if (!tutorialSeen()) setTutorialOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const closeTutorial = () => {
    markTutorialSeen();
    setTutorialOpen(false);
  };

  // Giriş ekranı açıkken 3D modeller arka planda iner; ilk tur kapsül figür göstermeden başlar.
  useEffect(() => {
    if (status !== "idle" || competitions.length === 0) return;
    const timer = setTimeout(() => {
      void import("./pitch3d/preload").then((m) => m.preloadScene()).catch(() => undefined);
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, competitions.length]);
  const [finishedGames, setFinishedGames] = useState(0);
  // Boş küme "tümü" demektir; böylece yeni turnuva eklenince seçim bozulmaz. Bağlantıyla
  // gelen ön seçim varsa onun dışındakiler kapalı başlar (hepsini seçiyorsa yine boş küme).
  const [excluded, setExcluded] = useState<Set<string>>(() => {
    if (preselected.length === 0) return new Set();
    const wanted = new Set(preselected);
    const rest = competitions.filter((c) => !wanted.has(c.id)).map((c) => c.id);
    return rest.length === competitions.length ? new Set() : new Set(rest);
  });
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [shot, setShot] = useState<ShotType | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [clue, setClue] = useState<Hint | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [nextInMs, setNextInMs] = useState(AUTO_NEXT_MS);

  // Süre dolduğunda en güncel seçimi okuyabilmek için.
  const selection = useRef<{ target: Target | null; shot: ShotType | null }>({ target: null, shot: null });
  const locking = useRef(false);
  // Tahmin süresinin biteceği an; duraklatıp sürdürünce sunucunun verdiği kalan süreyle yenilenir.
  const deadline = useRef(0);

  const beginRound = useCallback((next: PublicRound) => {
    selection.current = { target: null, shot: null };
    locking.current = false;
    deadline.current = Date.now() + next.timeLimitMs;
    setRound(next);
    setTarget(null);
    setShot(null);
    setHint(null);
    setClue(null);
    setResult(null);
    setRemainingMs(next.timeLimitMs);
    setStatus("guessing");
  }, []);

  const requestClue = useCallback(async () => {
    if (!gameId) return;
    try {
      setClue(await post<Hint>(`/api/games/${gameId}/hint`));
    } catch (e) {
      setError(errorText(t, e));
    }
  }, [gameId, t]);

  const chosen = competitions.filter((c) => !excluded.has(c.id));
  const chosenCount = chosen.reduce((sum, c) => sum + c.count, 0);
  const allChosen = excluded.size === 0;
  const enoughPenalties = competitions.length === 0 || chosenCount >= ROUNDS_PER_GAME;

  // Hepsi açıkken tıklanan turnuva tek başına seçilir ("Süper Lig"e basınca yalnız o oynanır).
  const toggleCompetitions = (ids: string[]) => {
    setExcluded((current) => toggleGroup(competitions.map((c) => c.id), current, ids));
  };

  const startGame = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setHistory([]);
    try {
      const trimmed = name.trim();
      if (trimmed) saveName(trimmed);
      if (region) saveRegion(region);
      const request: NewGameRequest = {
        ...(excluded.size === 0
          ? {}
          : { competitions: competitions.filter((c) => !excluded.has(c.id)).map((c) => c.id) }),
        // Takma ad ve bölge seçildiyse biten oyun toplam puan sıralamasına sayılır.
        ...(trimmed && region && token ? { token, name: trimmed, region } : {}),
      };
      const game = await post<NewGameResponse>("/api/games", request);
      setGameId(game.gameId);
      beginRound(game.round);
    } catch (e) {
      setStatus("idle");
      setError(errorText(t, e));
    }
  }, [beginRound, competitions, excluded, name, region, token, t]);

  const lock = useCallback(
    async (timedOut: boolean) => {
      if (locking.current) return;
      const { target: chosen, shot: s } = selection.current;
      const guess = chosen && s ? { target: chosen, shot: s } : null;
      if (!guess && !timedOut) {
        setHint(t(!chosen ? "round.pickTarget" : "round.pickShot"));
        return;
      }
      locking.current = true;
      setHint(null);
      setError(null);
      try {
        const res = await post<RoundResult>(`/api/games/${gameId}/guess`, { guess });
        setResult(res);
        setHistory((items) => [...items, res]);
        if (res.finished) setFinishedGames((n) => n + 1);
        setStatus("shooting");
        await wait(shotDurationMs(res.answer));
        setNextInMs(AUTO_NEXT_MS);
        setStatus("revealed");
      } catch (e) {
        locking.current = false;
        setError(errorText(t, e));
      }
    },
    [gameId, t],
  );

  const pause = useCallback(async () => {
    if (!gameId || locking.current) return;
    try {
      await post(`/api/games/${gameId}/pause`);
      setStatus("paused");
    } catch (e) {
      setError(errorText(t, e));
    }
  }, [gameId, t]);

  const resume = useCallback(async () => {
    if (!gameId) return;
    try {
      const { remainingMs: left } = await post<{ remainingMs: number }>(`/api/games/${gameId}/resume`);
      deadline.current = Date.now() + left;
      setRemainingMs(left);
      setStatus("guessing");
    } catch (e) {
      setError(errorText(t, e));
    }
  }, [gameId, t]);

  /** Oyunu yarıda bırakır; sunucudaki oyun süresi dolunca silinir. Challenge'da puan zaten işlenmiştir. */
  const quit = useCallback(() => {
    if (mode === "challenge") setFinishedGames((n) => n + 1);
    setGameId(null);
    setRound(null);
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [mode]);

  const advance = useCallback(async () => {
    if (result?.finished) {
      setStatus("finished");
      return;
    }
    setError(null);
    try {
      beginRound(await post<PublicRound>(`/api/games/${gameId}/next`));
    } catch (e) {
      setError(errorText(t, e));
    }
  }, [beginRound, gameId, result, t]);

  // Özet ekranı: geri sayım biter bitmez sıradaki penaltıya (son turda sonuçlara) geçilir.
  useEffect(() => {
    if (status !== "revealed") return;
    const deadline = Date.now() + AUTO_NEXT_MS;
    const timer = setInterval(() => {
      const left = Math.max(deadline - Date.now(), 0);
      setNextInMs(left);
      if (left <= 0) {
        clearInterval(timer);
        void advance();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [status, advance]);

  useEffect(() => {
    if (status !== "guessing" || !round) return;
    const timer = setInterval(() => {
      const left = deadline.current - Date.now();
      setRemainingMs(Math.max(left, 0));
      if (left <= 0) {
        clearInterval(timer);
        void lock(true);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [status, round, lock]);

  // Kimlik yalnızca ana sayfada girilir; diğer ekranlar bunu hazır alır.
  const identityReady = name.trim().length > 0 && region !== "";

  if (mode === "multi" && region) {
    return (
      <Multiplayer
        competitions={competitions}
        selectedCompetitions={allChosen ? null : chosen.map((c) => c.id)}
        name={name.trim()}
        region={region}
        onBack={() => setMode("single")}
      />
    );
  }

  if (mode === "challenge" && region && (status === "idle" || status === "loading")) {
    return (
      <Challenge
        token={token}
        name={name.trim()}
        region={region}
        onStart={(game) => {
          setError(null);
          setHistory([]);
          setGameId(game.gameId);
          beginRound(game.round);
        }}
        onBack={() => setMode("single")}
      />
    );
  }

  if (status === "idle" || status === "loading") {
    return (
      <main className={styles.intro}>
        <div className={styles.introLayout}>
        {token && (
          <aside className={styles.boardPanel}>
            <SoloBoard token={token} initialRegion={region || "world"} refresh={finishedGames} />
          </aside>
        )}
        <div className={styles.card}>
          <div className={styles.langSwitch} role="group" aria-label={t("intro.language")}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={code === locale ? styles.langOn : styles.langBtn}
                aria-pressed={code === locale}
                lang={code}
                onClick={() => setLocale(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <span className={styles.eyebrow}>
            {competitions.length > 0 ? t("intro.eyebrowReal") : t("intro.eyebrowSample")}
          </span>
          <h1>{t("app.title")}</h1>
          <div className={styles.tagline}>
            <p>{t("intro.tagline")}</p>
            <button type="button" className={styles.howTo} onClick={() => setTutorialOpen(true)}>
              <HelpIcon />
              {t("intro.howTo")}
            </button>
          </div>
          {tutorialOpen && <Tutorial onClose={closeTutorial} />}
          {pickerOpen && competitions.length > 0 && (
            <CompetitionSheet
              competitions={competitions}
              excluded={excluded}
              onToggle={toggleCompetitions}
              onAll={() => setExcluded(new Set())}
              onClose={() => setPickerOpen(false)}
              warning={enoughPenalties ? null : t("intro.poolTooSmall", { min: ROUNDS_PER_GAME, n: chosenCount })}
            />
          )}
          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span>{t("intro.nickname")}</span>
              <input
                value={name}
                maxLength={20}
                placeholder={t("intro.nicknamePlaceholder")}
                autoComplete="nickname"
                onChange={(e) => {
                  setName(e.target.value);
                  saveName(e.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              <span>{t("intro.yourRegion")}</span>
              <select
                value={region}
                onChange={(e) => {
                  const value = e.target.value as RegionId | "";
                  setRegion(value);
                  saveRegion(value);
                }}
              >
                <option value="">{t("common.choose")}</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{regionName(t, r.id)}</option>
                ))}
              </select>
            </label>
          </div>
          {competitions.length > 0 && (
            <CompetitionBar competitions={competitions} excluded={excluded} onOpen={() => setPickerOpen(true)} />
          )}
          <div className={styles.modeCards}>
            <button
              type="button"
              className={`${styles.modeCard} ${styles.modeCardPrimary}`}
              onClick={startGame}
              disabled={status === "loading" || !enoughPenalties}
            >
              <span className={styles.modeIcon}><PlayIcon /></span>
              <strong>{status === "loading" ? t("common.preparing") : t("intro.playSolo")}</strong>
              <span className={styles.modeDesc}>{t("intro.modeSoloDesc")}</span>
            </button>
            <button
              type="button"
              className={styles.modeCard}
              onClick={() => setMode("multi")}
              disabled={status === "loading" || !enoughPenalties || !identityReady}
            >
              <span className={styles.modeIcon}><UsersIcon /></span>
              <strong>{t("intro.playFriends")}</strong>
              <span className={styles.modeDesc}>{t("intro.modeFriendsDesc")}</span>
            </button>
            <button
              type="button"
              className={styles.modeCard}
              onClick={() => setMode("challenge")}
              disabled={status === "loading" || competitions.length === 0 || !identityReady}
            >
              <span className={styles.modeIcon}><GlobeIcon /></span>
              <strong>{t("intro.weeklyChallenge")}</strong>
              <span className={styles.modeDesc}>{t("intro.modeChallengeDesc")}</span>
            </button>
          </div>
          <p className={styles.note}>
            {identityReady ? t("intro.identityReady") : t("intro.identityMissing")}
          </p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {competitions.length === 0 && <p className={styles.note}>{t("intro.sampleNote")}</p>}
        </div>
        {token && (
          <aside className={`${styles.boardPanel} ${styles.boardPanelRight}`}>
            <ChallengeBoard token={token} initialRegion={region || "world"} refresh={finishedGames} />
          </aside>
        )}
        </div>
        <AdSlot slot="intro" />
        {footer}
      </main>
    );
  }

  if (status === "finished") {
    const exact = history.filter((r) => r.points.zone === 100).length;
    const shots = history.filter((r) => r.points.shot > 0).length;
    const best = Math.max(0, ...history.map((r) => r.streak));
    return (
      <main className={styles.intro}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{t("finish.eyebrow")}</span>
          <h1>{t("finish.title")}</h1>
          <p className={styles.finalScore}>{result?.totalScore ?? 0}<span>{t("common.points")}</span></p>
          <ul className={styles.rules}>
            <li><i className={styles.ruleIcon}><TargetIcon /></i><strong>{exact}/{history.length}</strong> {t("finish.exact")}</li>
            <li><i className={styles.ruleIcon}><BootIcon /></i><strong>{shots}/{history.length}</strong> {t("finish.shots")}</li>
            <li><i className={styles.ruleIcon}><FlameIcon /></i><strong>{best}</strong> {t("finish.bestStreak")}</li>
          </ul>
          {mode === "challenge" ? (
            <button className={styles.start} onClick={() => setStatus("idle")}>
              <GlobeIcon />
              {t("finish.seeRanking")}
            </button>
          ) : (
            <>
              {token && name.trim() && region && (
                <SoloBoard token={token} initialRegion={region} refresh={finishedGames} compact />
              )}
              <div className={styles.actions}>
                <button className={styles.start} onClick={startGame}>
                  <ReplayIcon />
                  {t("finish.playAgain")}
                </button>
                <button className={styles.secondary} onClick={() => setStatus("idle")}>
                  <GlobeIcon />
                  {t("finish.seeRanking")}
                </button>
              </div>
            </>
          )}
        </div>
        <AdSlot slot="finish" />
      </main>
    );
  }

  if (!round) return null;

  // Vuruş oynarken skor çubuğu henüz önceki turun değerini gösterir.
  const shown = status === "revealed" ? result : history.at(status === "shooting" ? -2 : -1);

  return (
    <RoundView
      round={round}
      status={status === "shooting" || status === "revealed" || status === "paused" ? status : "guessing"}
      remainingMs={remainingMs}
      score={shown?.totalScore ?? 0}
      streak={shown?.streak ?? 0}
      target={target}
      shot={shot}
      result={result}
      onTarget={(chosen) => {
        selection.current.target = chosen;
        setTarget(chosen);
        setHint(null);
      }}
      onShot={(type) => {
        selection.current.shot = type;
        setShot(type);
        setHint(null);
      }}
      onLock={() => void lock(false)}
      clue={clue}
      onClue={() => void requestClue()}
      revealAction={
        result && (
          <div className={styles.nextAction}>
            <button className={styles.primary} onClick={advance}>
              {result.finished ? <FlagIcon /> : <ArrowRightIcon />}
              {result.finished ? t("summary.seeResults") : t("summary.skip")}
            </button>
            <span className={styles.nextIn}>
              {result.finished ? t("summary.results") : t("summary.nextPenalty")}{" "}
              {t("common.secondsLater", { n: Math.ceil(nextInMs / 1000) })}
            </span>
          </div>
        )
      }
      hint={hint}
      error={
        error && (
          <p className={styles.error} role="alert">
            {error} <button className={styles.linkBtn} onClick={startGame}>{t("round.newGame")}</button>
          </p>
        )
      }
      // Challenge herkes için aynı koşullarda oynanır; duraklatma yalnızca tek kişilik oyunda.
      onPause={mode === "challenge" ? undefined : () => void pause()}
      onResume={() => void resume()}
      onQuit={quit}
      quitNote={t(mode === "challenge" ? "round.quitChallenge" : "round.quitSolo")}
    />
  );
}
