import { describe, expect, it } from "vitest";
import {
  addCategory,
  addPenalty,
  EMPTY_STORE,
  historyFor,
  removeCategory,
  removePenalty,
  toPenalty,
  validateCategory,
  validateManualPenalty,
  type ManualPenaltyInput,
} from "./manual";

const valid: ManualPenaltyInput = {
  competition: "Süper Lig",
  season: "2025/26",
  playerName: "Mauro Icardi",
  team: "Galatasaray",
  opponent: "Fenerbahçe",
  date: "2025-11-02",
  foot: "right",
  situation: "regular",
  minute: 67,
  score: "1-1",
  col: 0,
  row: 2,
  shot: "placed",
  outcome: "goal",
  keeperDive: 2,
};

describe("validateManualPenalty", () => {
  it("geçerli girişi kırpılmış metinlerle kabul eder", () => {
    const result = validateManualPenalty({ ...valid, team: "  Galatasaray  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.team).toBe("Galatasaray");
  });

  it("seri penaltıda dakikayı yok sayar", () => {
    const result = validateManualPenalty({ ...valid, situation: "shootout", minute: "abc" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.minute).toBeNull();
  });

  it("eksik ve bozuk alanları Türkçe hatalarla döner", () => {
    const result = validateManualPenalty({ ...valid, playerName: "", date: "2025-13-45", score: "x", minute: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Oyuncu adı boş olamaz.",
          "Tarih YYYY-AA-GG biçiminde olmalı.",
          "Dakika 1 ile 130 arasında olmalı.",
          'Skor "1-0" biçiminde, atan takımın gözünden olmalı.',
        ]),
      );
    }
  });

  it("kurtarışta kaleci yönünü ve panenkada sütunu denetler", () => {
    const saved = validateManualPenalty({ ...valid, outcome: "saved", keeperDive: 1 });
    expect(saved.ok).toBe(false);
    const panenka = validateManualPenalty({ ...valid, shot: "panenka", col: 2 });
    expect(panenka.ok).toBe(false);
    expect(validateManualPenalty({ ...valid, shot: "panenka", col: 1 }).ok).toBe(true);
  });

  it("gövde nesne değilse reddeder", () => {
    expect(validateManualPenalty("x").ok).toBe(false);
    expect(validateCategory(null).ok).toBe(false);
    expect(validateCategory({ competition: "Süper Lig", season: " 2025/26 " })).toEqual({
      ok: true,
      value: { competition: "Süper Lig", season: "2025/26" },
    });
  });
});

describe("depo işlemleri", () => {
  it("penaltı eklenince kategorisi de eklenir, aynı kategori çoğalmaz", () => {
    let store = addCategory(EMPTY_STORE, { competition: "Süper Lig", season: "2025/26" });
    store = addCategory(store, { competition: "Süper Lig", season: "2025/26" });
    store = addPenalty(store, toPenalty(valid, "m-1", []));
    expect(store.categories).toHaveLength(1);
    expect(store.penalties.map((p) => p.id)).toEqual(["m-1"]);
    expect(removePenalty(store, "m-1").penalties).toEqual([]);
  });

  it("boş kategori silinir, penaltısı olan silinmez", () => {
    const category = { competition: "Süper Lig", season: "2025/26" };
    const empty = addCategory(addCategory(EMPTY_STORE, category), { competition: "La Liga", season: "2025/26" });
    const result = removeCategory(empty, { competition: "La Liga", season: "2025/26" });
    expect(result.removed).toBe(true);
    expect(result.store.categories).toEqual([category]);

    const used = addPenalty(empty, toPenalty(valid, "m-1", []));
    const blocked = removeCategory(used, category);
    expect(blocked.removed).toBe(false);
    expect(blocked.store).toBe(used);
  });

  it("geçmiş aynı oyuncunun daha eski penaltılarından, en çok 10 tane sayılır", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      toPenalty({ ...valid, date: `2025-01-${String(i + 1).padStart(2, "0")}`, col: i % 2 === 0 ? 0 : 2 }, `p${i}`, []),
    );
    expect(historyFor(pool, "Mauro Icardi", "2025-02-01")).toEqual({ left: 5, center: 0, right: 5 });
    expect(historyFor(pool, "Mauro Icardi", "2025-01-01")).toEqual({ left: 0, center: 0, right: 0 });
    expect(historyFor(pool, "Başkası", "2025-02-01")).toEqual({ left: 0, center: 0, right: 0 });
  });

  it("kayıt oyun şemasına uyar", () => {
    const penalty = toPenalty({ ...valid, situation: "shootout" }, "m-2", []);
    expect(penalty.minute).toBeNull();
    expect(penalty.match).toEqual({ competition: "Süper Lig", season: "2025/26", opponent: "Fenerbahçe", date: "2025-11-02" });
    expect(penalty.answer).toEqual({ zone: { col: 0, row: 2 }, shot: "placed", outcome: "goal", keeperDive: 2 });
  });
});
