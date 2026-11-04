import { SHOT_TYPES, type Index, type Outcome, type Penalty, type ShotType, type Situation } from "@/game/types";

/**
 * Elle girilen penaltılar (ör. Süper Lig). Yönetim ekranından yazılır, `penalties.manual.json`
 * dosyasında durur ve StatsBomb'dan üretilen havuza eklenir. Buradaki mantık saftır; dosya
 * işleri `src/server/manualStore.ts` içindedir.
 */

export interface ManualCategory {
  competition: string;
  season: string;
}

export interface ManualStore {
  categories: ManualCategory[];
  penalties: Penalty[];
}

export const EMPTY_STORE: ManualStore = { categories: [], penalties: [] };

/** Formdan gelen ham giriş; her alan doğrulanır. */
export interface ManualPenaltyInput {
  competition: string;
  season: string;
  playerName: string;
  team: string;
  opponent: string;
  date: string;
  foot: "left" | "right";
  situation: Situation;
  minute: number | null;
  score: string;
  col: Index;
  row: Index;
  shot: ShotType;
  outcome: Outcome;
  keeperDive: Index;
}

const MAX_TEXT = 40;
const isIndex = (v: unknown): v is Index => v === 0 || v === 1 || v === 2;

function text(value: unknown, label: string, errors: string[]): string {
  const s = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!s) errors.push(`${label} boş olamaz.`);
  else if (s.length > MAX_TEXT) errors.push(`${label} en çok ${MAX_TEXT} karakter olabilir.`);
  return s;
}

/** Girişi doğrular; hatalar Türkçe metin listesi olarak döner. */
export function validateManualPenalty(
  raw: unknown,
): { ok: true; value: ManualPenaltyInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: ["Geçersiz gövde."] };
  const r = raw as Record<string, unknown>;

  const competition = text(r.competition, "Turnuva", errors);
  const season = text(r.season, "Sezon", errors);
  const playerName = text(r.playerName, "Oyuncu adı", errors);
  const team = text(r.team, "Takım", errors);
  const opponent = text(r.opponent, "Rakip", errors);

  const date = typeof r.date === "string" ? r.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    errors.push("Tarih YYYY-AA-GG biçiminde olmalı.");
  }

  const foot = r.foot === "left" || r.foot === "right" ? r.foot : null;
  if (!foot) errors.push("Ayak sol ya da sağ olmalı.");

  const situation = r.situation === "regular" || r.situation === "shootout" ? r.situation : null;
  if (!situation) errors.push("Durum normal süre ya da seri penaltı olmalı.");

  let minute: number | null = null;
  if (situation === "regular") {
    const m = typeof r.minute === "number" ? r.minute : Number(r.minute);
    if (!Number.isInteger(m) || m < 1 || m > 130) errors.push("Dakika 1 ile 130 arasında olmalı.");
    else minute = m;
  }

  const score = typeof r.score === "string" ? r.score.trim() : "";
  if (!/^\d{1,2}-\d{1,2}$/.test(score)) errors.push("Skor \"1-0\" biçiminde, atan takımın gözünden olmalı.");

  if (!isIndex(r.col) || !isIndex(r.row)) errors.push("Kalede bir bölge seçilmeli.");
  const shot = SHOT_TYPES.includes(r.shot as ShotType) ? (r.shot as ShotType) : null;
  if (!shot) errors.push("Vuruş tipi seçilmeli.");
  const outcome = r.outcome === "goal" || r.outcome === "saved" || r.outcome === "missed" ? r.outcome : null;
  if (!outcome) errors.push("Sonuç gol, kurtarış ya da kaçan olmalı.");
  if (!isIndex(r.keeperDive)) errors.push("Kalecinin yönü seçilmeli.");

  if (isIndex(r.col) && isIndex(r.keeperDive) && outcome === "saved" && r.keeperDive !== r.col) {
    errors.push("Kurtarışta kaleci topun olduğu sütuna dalmış olmalı.");
  }
  if (isIndex(r.col) && shot === "panenka" && r.col !== 1) {
    errors.push("Panenka yalnızca orta sütuna atılabilir.");
  }

  if (errors.length > 0 || !foot || !situation || !shot || !outcome || !isIndex(r.col) || !isIndex(r.row) || !isIndex(r.keeperDive)) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      competition, season, playerName, team, opponent, date, foot, situation, minute, score,
      col: r.col, row: r.row, shot, outcome, keeperDive: r.keeperDive,
    },
  };
}

export function validateCategory(raw: unknown): { ok: true; value: ManualCategory } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: ["Geçersiz gövde."] };
  const r = raw as Record<string, unknown>;
  const competition = text(r.competition, "Turnuva", errors);
  const season = text(r.season, "Sezon", errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: { competition, season } };
}

/**
 * Oyuncunun havuzdaki önceki (en çok 10) penaltılarının yön dağılımı; aynı ad ve daha eski
 * tarih eşleşir. Elle girişte oyuncu kimliği olmadığı için ad kullanılır.
 */
export function historyFor(pool: readonly Penalty[], playerName: string, date: string): Penalty["history"] {
  const previous = pool
    .filter((p) => p.match && p.player.name === playerName && p.match.date < date)
    .sort((a, b) => a.match!.date.localeCompare(b.match!.date))
    .slice(-10);
  return {
    left: previous.filter((p) => p.answer.zone.col === 0).length,
    center: previous.filter((p) => p.answer.zone.col === 1).length,
    right: previous.filter((p) => p.answer.zone.col === 2).length,
  };
}

/** Doğrulanmış girişi havuz kaydına çevirir. */
export function toPenalty(input: ManualPenaltyInput, id: string, pool: readonly Penalty[]): Penalty {
  return {
    id,
    player: { name: input.playerName, team: input.team, foot: input.foot },
    situation: input.situation,
    minute: input.situation === "shootout" ? null : input.minute,
    score: input.score,
    history: historyFor(pool, input.playerName, input.date),
    match: { competition: input.competition, season: input.season, opponent: input.opponent, date: input.date },
    answer: {
      zone: { col: input.col, row: input.row },
      shot: input.shot,
      outcome: input.outcome,
      keeperDive: input.keeperDive,
    },
  };
}

/** Kategori listesine ekler; aynı turnuva ve sezon varsa dokunmaz. */
export function addCategory(store: ManualStore, category: ManualCategory): ManualStore {
  const exists = store.categories.some(
    (c) => c.competition === category.competition && c.season === category.season,
  );
  return exists ? store : { ...store, categories: [...store.categories, category] };
}

/** Kategoriyi siler; içinde penaltı varsa dokunmaz ve false döner. */
export function removeCategory(store: ManualStore, category: ManualCategory): { store: ManualStore; removed: boolean } {
  const used = store.penalties.some(
    (p) => p.match?.competition === category.competition && p.match?.season === category.season,
  );
  if (used) return { store, removed: false };
  return {
    store: {
      ...store,
      categories: store.categories.filter(
        (c) => !(c.competition === category.competition && c.season === category.season),
      ),
    },
    removed: true,
  };
}

export function addPenalty(store: ManualStore, penalty: Penalty): ManualStore {
  const category = { competition: penalty.match!.competition, season: penalty.match!.season };
  return { ...addCategory(store, category), penalties: [...store.penalties, penalty] };
}

export function removePenalty(store: ManualStore, id: string): ManualStore {
  return { ...store, penalties: store.penalties.filter((p) => p.id !== id) };
}
