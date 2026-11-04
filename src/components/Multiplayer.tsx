"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { competitionLabel, regionName } from "@/game/labels";
import type { RegionId } from "@/game/regions";
import type {
  CompetitionOption,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomJoinResponse,
  RoomState,
  ShotType,
  Target,
} from "@/game/types";
import { useT } from "@/i18n/LocaleProvider";
import { errorText, post } from "./api";
import styles from "./Game.module.css";
import { BackIcon, BulbIcon, CheckIcon, CopyIcon, FlagIcon, PlayIcon, TrophyIcon, UsersIcon } from "./Icons";
import { shotDurationMs } from "./pitch3d/animation";
import { RoundView, type RoundStatus } from "./RoundView";

const SESSION_KEY = "penalti-tahmin:oda";

interface RoomSession {
  code: string;
  playerId: string;
}

interface MultiplayerProps {
  competitions: CompetitionOption[];
  /** Girişte seçilen turnuvalar; null ise hepsi. Oda kurarken kullanılır. */
  selectedCompetitions: string[] | null;
  /** Ana sayfada girilen ad ve bölge; burada yeniden sorulmaz. */
  name: string;
  region: RegionId;
  onBack: () => void;
}

const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

function readSession(): RoomSession | null {
  const saved = readStorage(SESSION_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as RoomSession;
  } catch {
    return null;
  }
}

const writeStorage = (storage: "local" | "session", key: string, value: string | null) => {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    // depolama kapalıysa sessizce geç
  }
};

/** Adresteki `?oda=KOD` parametresi; paylaşılan bağlantıyla gelenler için. */
function codeFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return new URL(window.location.href).searchParams.get("oda")?.toUpperCase() ?? "";
  } catch {
    return "";
  }
}

export function Multiplayer({ competitions, selectedCompetitions, name, region, onBack }: MultiplayerProps) {
  const t = useT();
  // Bileşen yalnızca istemcide, bir tıklamayla açılır; kayıtlı oturum doğrudan okunur.
  const [codeInput, setCodeInput] = useState(codeFromUrl);
  const [session, setSession] = useState<RoomSession | null>(readSession);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tur içi yerel durum: seçim, kilit ve vuruş animasyonu.
  const [status, setStatus] = useState<RoundStatus>("guessing");
  const [target, setTarget] = useState<Target | null>(null);
  const [shot, setShot] = useState<ShotType | null>(null);
  const [locked, setLocked] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [nextInMs, setNextInMs] = useState(0);
  const clockOffset = useRef(0);

  // Evre değişimi render sırasında türetilir: yeni turda seçim sıfırlanır, açıklamada vuruş oynar.
  const roundKey = room?.round ? `${room.round.number}:${room.phase}` : null;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (roundKey !== seenKey) {
    setSeenKey(roundKey);
    if (room?.phase === "guessing") {
      setTarget(null);
      setShot(null);
      setLocked(false);
      setHint(null);
      setStatus("guessing");
    } else if (room?.phase === "reveal") {
      setStatus("shooting");
    }
  }

  const leave = useCallback(
    (notifyServer: boolean) => {
      if (notifyServer && session) {
        void post(`/api/rooms/${session.code}/leave`, { playerId: session.playerId }).catch(() => undefined);
      }
      writeStorage("session", SESSION_KEY, null);
      setSession(null);
      setRoom(null);
      setError(null);
    },
    [session],
  );

  // Canlı yayın: oda durumu her değişiklikte gelir.
  useEffect(() => {
    if (!session) return;
    const source = new EventSource(
      `/api/rooms/${session.code}/events?playerId=${encodeURIComponent(session.playerId)}`,
    );
    source.onmessage = (event) => {
      const state = JSON.parse(event.data) as RoomState;
      clockOffset.current = state.serverNow - Date.now();
      setRoom(state);
      setError(null);
    };
    source.addEventListener("gone", () => {
      source.close();
      setError(t("multi.roomClosed"));
      writeStorage("session", SESSION_KEY, null);
      setSession(null);
      setRoom(null);
    });
    source.onerror = () => {
      // EventSource kendi yeniden bağlanır; oda yoksa sunucu 404 döner ve bağlantı kapanır.
      if (source.readyState === EventSource.CLOSED) {
        setError(t("multi.connectFailed"));
        writeStorage("session", SESSION_KEY, null);
        setSession(null);
        setRoom(null);
      }
    };
    return () => source.close();
  }, [session, t]);

  // Vuruş animasyonu bitince sonuç gösterilir. Süre yalnızca vuruş tipine bağlıdır.
  const revealDuration = room?.reveal ? shotDurationMs(room.reveal.answer) : 0;
  useEffect(() => {
    if (status !== "shooting" || revealDuration === 0) return;
    const timer = setTimeout(() => setStatus("revealed"), revealDuration);
    return () => clearTimeout(timer);
  }, [roundKey, status, revealDuration]);

  const lock = useCallback(async () => {
    if (!session || !room || room.phase !== "guessing" || locked) return;
    if (!target || !shot) {
      setHint(t(!target ? "round.pickTarget" : "round.pickShot"));
      return;
    }
    setLocked(true);
    setHint(null);
    try {
      await post(`/api/rooms/${session.code}/guess`, { playerId: session.playerId, guess: { target, shot } });
    } catch (e) {
      setLocked(false);
      setError(errorText(t, e));
    }
  }, [session, room, locked, target, shot, t]);

  // Geri sayımlar sunucu saatine göre; süre dolarken hazır tahmin kendiliğinden gönderilir.
  const phase = room?.phase ?? null;
  const deadline = room?.deadline ?? null;
  const nextRoundAt = room?.nextRoundAt ?? null;
  useEffect(() => {
    if (phase !== "guessing" && phase !== "reveal") return;
    const timer = setInterval(() => {
      const now = Date.now() + clockOffset.current;
      if (phase === "guessing" && deadline !== null) {
        const left = Math.max(deadline - now, 0);
        setRemainingMs(left);
        if (left === 0 && !locked && target && shot) void lock();
      }
      if (phase === "reveal" && nextRoundAt !== null) {
        setNextInMs(Math.max(nextRoundAt - now, 0));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, deadline, nextRoundAt, locked, target, shot, lock]);

  const enter = async (request: () => Promise<RoomJoinResponse>) => {
    setBusy(true);
    setError(null);
    try {
      const joined = await request();
      const next = { code: joined.code, playerId: joined.playerId };
      writeStorage("session", SESSION_KEY, JSON.stringify(next));
      setRoom(joined.state);
      setSession(next);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const createRoom = () =>
    enter(() => {
      const body: CreateRoomRequest = { name, ...(selectedCompetitions ? { competitions: selectedCompetitions } : {}) };
      return post<RoomJoinResponse>("/api/rooms", body);
    });

  const joinRoom = () =>
    enter(() => {
      const body: JoinRoomRequest = { name };
      return post<RoomJoinResponse>(`/api/rooms/${codeInput.trim().toUpperCase()}/join`, body);
    });

  const startRoom = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/api/rooms/${session.code}/start`, { playerId: session.playerId });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!session) return;
    const link = `${window.location.origin}/?oda=${session.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t("multi.copyFailed", { link }));
    }
  };

  // ---- Kurulum: ad, oda kur ya da koda katıl ----
  if (!session || !room) {
    const chosenLabel = selectedCompetitions
      ? competitions
          .filter((c) => selectedCompetitions.includes(c.id))
          .map((c) => competitionLabel(t, c.competition, c.season))
          .join(", ")
      : t("multi.allCompetitions");
    const nameOk = name.length > 0;
    return (
      <main className={styles.intro}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{t("multi.eyebrow")}</span>
          <h1>{t("multi.title")}</h1>
          <p>{t("multi.description")}</p>
          <p className={styles.identity}>
            <strong>{name}</strong> · {regionName(t, region)}
            <button className={styles.linkBtn} onClick={onBack}>{t("common.change")}</button>
          </p>
          <div className={styles.setupGrid}>
            <section className={styles.setupBox}>
              <h2><TrophyIcon /> {t("multi.newRoom")}</h2>
              <p>{t("multi.penaltiesFrom", { list: chosenLabel })}</p>
              <button className={styles.start} disabled={busy || !nameOk} onClick={() => void createRoom()}>
                <PlayIcon />
                {t("multi.create")}
              </button>
            </section>
            <section className={styles.setupBox}>
              <h2><UsersIcon /> {t("multi.join")}</h2>
              <label className={styles.field}>
                <span>{t("multi.code")}</span>
                <input
                  value={codeInput}
                  maxLength={5}
                  placeholder="ABCDE"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={styles.codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nameOk && codeInput.trim().length === 5) void joinRoom();
                  }}
                />
              </label>
              <button
                className={styles.primary}
                disabled={busy || !nameOk || codeInput.trim().length !== 5}
                onClick={() => void joinRoom()}
              >
                <UsersIcon />
                {t("multi.joinButton")}
              </button>
            </section>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.linkBtn} onClick={onBack}>
            <BackIcon /> {t("common.back")}
          </button>
        </div>
      </main>
    );
  }

  const me = room.players.find((p) => p.id === room.you);
  const isHost = room.hostId === room.you;

  // ---- Lobi ----
  if (room.phase === "lobby") {
    return (
      <main className={styles.intro}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{t("multi.roomReady")}</span>
          <h1>{t("multi.invite")}</h1>
          <div className={styles.roomCode} aria-label={t("multi.roomCode", { code: room.code })}>
            {room.code.split("").map((ch, i) => <span key={i}>{ch}</span>)}
          </div>
          <button className={styles.secondary} onClick={() => void copyInvite()}>
            <CopyIcon />
            {copied ? t("multi.copied") : t("multi.copyLink")}
          </button>
          <ul className={styles.playerList} aria-label={t("multi.players")}>
            {room.players.map((p) => (
              <li key={p.id}>
                <span className={styles.avatar}>{p.name.charAt(0).toLocaleUpperCase(t.locale)}</span>
                <span>{p.name}{p.id === room.you && t("common.youSuffix")}</span>
                {p.isHost && <em>{t("multi.host")}</em>}
              </li>
            ))}
          </ul>
          {isHost ? (
            <button className={styles.start} disabled={busy} onClick={() => void startRoom()}>
              <PlayIcon />
              {t("multi.startGame")}
            </button>
          ) : (
            <p className={styles.note}>{t("multi.waitingHost")}</p>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button
            className={styles.linkBtn}
            onClick={() => {
              leave(true);
              onBack();
            }}
          >
            <BackIcon /> {t("multi.leave")}
          </button>
        </div>
      </main>
    );
  }

  // ---- Bitiş: liderlik tablosu ----
  if (room.phase === "finished") {
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <main className={styles.intro}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>{t("multi.gameOver")}</span>
          <h1>{t("multi.scoreboard")}</h1>
          <ol className={styles.leaderboard}>
            {ranked.map((p, i) => (
              <li key={p.id} className={p.id === room.you ? styles.leaderMe : undefined}>
                <span className={styles.rank}>{medals[i] ?? `${i + 1}.`}</span>
                <span className={styles.leaderName}>{p.name}{p.id === room.you && t("common.youSuffix")}</span>
                <strong>{p.score}</strong>
              </li>
            ))}
          </ol>
          <button
            className={styles.start}
            onClick={() => {
              leave(false);
            }}
          >
            <FlagIcon />
            {t("multi.newRoomButton")}
          </button>
          <button
            className={styles.linkBtn}
            onClick={() => {
              leave(false);
              onBack();
            }}
          >
            <BackIcon /> {t("common.back")}
          </button>
        </div>
      </main>
    );
  }

  if (!room.round) return null;

  // ---- Tur ----
  const yours = room.reveal?.yours ?? null;
  const shownScore = status === "revealed" ? yours?.totalScore ?? me?.score ?? 0 : me?.score ?? 0;
  const shownStreak = status === "revealed" ? yours?.streak ?? me?.streak ?? 0 : me?.streak ?? 0;
  const isLast = room.round.number === room.totalRounds;

  return (
    <RoundView
      round={room.round}
      status={status}
      remainingMs={remainingMs}
      score={status === "shooting" ? shownScore - (yours?.points.total ?? 0) : shownScore}
      streak={shownStreak}
      target={target}
      shot={shot}
      locked={locked}
      result={yours}
      onTarget={(chosen) => {
        setTarget(chosen);
        setHint(null);
      }}
      onShot={(type) => {
        setShot(type);
        setHint(null);
      }}
      onLock={() => void lock()}
      clue={room.hint}
      onClue={() => {
        if (!session) return;
        post(`/api/rooms/${session.code}/hint`, { playerId: session.playerId }).catch((e) =>
          setError(errorText(t, e)),
        );
      }}
      revealAction={
        <p className={styles.nextIn}>
          {isLast ? t("summary.boardComing") : t("summary.nextPenalty")}{" "}
          {t("common.secondsLater", { n: Math.ceil(nextInMs / 1000) })}
        </p>
      }
      onQuit={() => {
        leave(true);
        onBack();
      }}
      quitNote={t("round.quitRoom")}
      aside={
        <ul className={styles.roomPlayers} aria-label={t("multi.roomPlayers")}>
          {room.players.map((p) => (
            <li key={p.id} className={p.submitted ? styles.roomChipDone : styles.roomChip}>
              <span>{p.name}</span>
              <strong>{p.score}</strong>
              {p.hintUsed && <BulbIcon />}
              {room.phase === "guessing" && p.submitted && <CheckIcon />}
              {room.phase === "reveal" && status === "revealed" && p.lastPoints !== null && (
                <em>+{p.lastPoints}</em>
              )}
            </li>
          ))}
        </ul>
      }
      hint={hint}
      error={error && <p className={styles.error} role="alert">{error}</p>}
    />
  );
}
