import { describe, expect, it } from "vitest";
import { EMPTY_SOLO_BOARD, rankedPlayers, recordGame, soloStatus } from "./soloBoard";

const tr = { name: "Ayşe", region: "tr" as const };
const eu = { name: "Luca", region: "eu" as const };

describe("toplam puan sıralaması", () => {
  it("biten oyunları toplar, en iyiyi ve oyun sayısını tutar, ad ve bölgeyi günceller", () => {
    let board = recordGame(EMPTY_SOLO_BOARD, "a", tr, 300, 1);
    board = recordGame(board, "a", { name: "Ayşe K.", region: "eu" }, 150, 2);
    expect(board.players.a).toEqual({ name: "Ayşe K.", region: "eu", total: 450, games: 2, best: 300, updatedAt: 2 });
  });

  it("toplama, sonra az oyuna, sonra erken ulaşana göre sıralar ve sana sıranı verir", () => {
    let board = recordGame(EMPTY_SOLO_BOARD, "a", tr, 300, 1);
    board = recordGame(board, "b", { name: "Can", region: "tr" }, 200, 2);
    board = recordGame(board, "b", { name: "Can", region: "tr" }, 100, 3);
    board = recordGame(board, "c", { name: "Ece", region: "tr" }, 300, 4);
    expect(rankedPlayers(board).map((r) => [r.token, r.rank])).toEqual([["a", 1], ["c", 2], ["b", 3]]);
    const status = soloStatus(board, "b");
    expect(status.players).toBe(3);
    expect(status.you).toEqual({ rank: 3, name: "Can", region: "tr", total: 300, games: 2, best: 200, you: true });
    expect(status.leaderboard.map((e) => e.you)).toEqual([false, false, true]);
    expect(soloStatus(board, null).you).toBeNull();
  });

  it("bölgeye göre süzer; bölge sırası dünya sırasından farklı olabilir", () => {
    let board = recordGame(EMPTY_SOLO_BOARD, "a", tr, 300, 1);
    board = recordGame(board, "b", eu, 500, 2);
    board = recordGame(board, "c", { name: "Mert", region: "tr" }, 400, 3);
    expect(soloStatus(board, "a", "world").you?.rank).toBe(3);
    expect(soloStatus(board, "a", "tr").you?.rank).toBe(2);
    expect(soloStatus(board, "a", "eu").you).toBeNull();
    expect(soloStatus(board, null, "eu").players).toBe(1);
  });

  it("listeyi 100 kişiyle sınırlar", () => {
    let board = EMPTY_SOLO_BOARD;
    for (let i = 0; i < 105; i++) board = recordGame(board, `t${i}`, { name: `O${i}`, region: "as" }, i * 10, i);
    const status = soloStatus(board, "t0");
    expect(status.leaderboard).toHaveLength(100);
    expect(status.you?.rank).toBe(105);
  });
});
