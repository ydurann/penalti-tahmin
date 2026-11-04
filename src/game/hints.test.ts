import { describe, expect, it } from "vitest";
import { translator } from "@/i18n";
import { hintFor, hintKind } from "./hints";
import { answerLabel, hintText, zoneLabel } from "./labels";
import type { PenaltyAnswer } from "./types";

const answer: PenaltyAnswer = { zone: { col: 2, row: 0 }, shot: "power", outcome: "goal", keeperDive: 0 };
const ids = Array.from({ length: 60 }, (_, i) => `id-${i}`);
const byKind = (kind: string) => ids.find((id) => hintKind(id) === kind)!;

describe("ipucu", () => {
  it("aynı penaltı için hep aynı türü verir, farklı kimlikler üç türü de kullanır", () => {
    expect(hintKind("sb-1")).toBe(hintKind("sb-1"));
    expect(new Set(ids.map(hintKind))).toEqual(new Set(["direction", "height", "shot"]));
  });

  it("türüne göre yön, yükseklik ya da vuruş tipini yapısal verir", () => {
    expect(hintFor(byKind("direction"), answer)).toEqual({ kind: "direction", value: 2 });
    expect(hintFor(byKind("height"), answer)).toEqual({ kind: "height", value: 0 });
    expect(hintFor(byKind("shot"), answer)).toEqual({ kind: "shot", value: "power" });
  });

  it("metin üç dilde üretilir", () => {
    const tr = translator("tr");
    const en = translator("en");
    const de = translator("de");
    expect(hintText(tr, { kind: "direction", value: 2 })).toBe("Top sağ tarafa gidiyor.");
    expect(hintText(tr, { kind: "direction", value: 1 })).toBe("Top ortaya gidiyor.");
    expect(hintText(tr, { kind: "height", value: 0 })).toBe("Top üst bölgeye gidiyor.");
    expect(hintText(tr, { kind: "height", value: 1 })).toBe("Top orta yükseklikte gidiyor.");
    expect(hintText(tr, { kind: "shot", value: "power" })).toBe("Vuruş sert.");
    expect(hintText(en, { kind: "direction", value: 0 })).toBe("The ball goes to the left.");
    expect(hintText(en, { kind: "shot", value: "placed" })).toBe("The shot is placed.");
    expect(hintText(de, { kind: "height", value: 2 })).toBe("Der Ball geht nach unten.");
    expect(hintText(de, { kind: "shot", value: "panenka" })).toBe("Die Schussart ist Panenka.");
  });

  it("bölge adları dile göre sıralanır ve büyük harfle başlar", () => {
    const tr = translator("tr");
    const en = translator("en");
    const de = translator("de");
    const topLeft = { col: 0, row: 0 } as const;
    expect(zoneLabel(tr, topLeft)).toBe("Sol üst");
    expect(zoneLabel(en, topLeft)).toBe("Top left");
    expect(zoneLabel(de, topLeft)).toBe("Oben links");
    expect(zoneLabel(tr, { col: 1, row: 1 })).toBe("Tam orta");
    const missed: PenaltyAnswer = { ...answer, zone: { col: 1, row: 0 }, outcome: "missed" };
    expect(answerLabel(tr, missed)).toBe("Dışarı (orta üst yönünde)");
    expect(answerLabel(en, missed)).toBe("Off target (towards top centre)");
    expect(answerLabel(de, missed)).toBe("Daneben (Richtung oben Mitte)");
  });
});
