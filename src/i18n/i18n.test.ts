import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";
import { detectLocale, translate } from "./index";
import { tr } from "./tr";

describe("sözlükler", () => {
  it("İngilizce ve Almanca, Türkçenin bütün anahtarlarını içerir, fazlası yoktur", () => {
    const keys = Object.keys(tr).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(de).sort()).toEqual(keys);
  });

  it("her dilde yer tutucular Türkçeyle aynıdır", () => {
    const holders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      expect(holders(en[key]), `en ${key}`).toEqual(holders(tr[key]));
      expect(holders(de[key]), `de ${key}`).toEqual(holders(tr[key]));
    }
  });

  it("parametreleri doldurur ve bilinmeyenleri bırakır", () => {
    expect(translate("tr", "round.history", { n: 4 })).toBe("Önceki 4 penaltı");
    expect(translate("en", "summary.speed", { n: 23, s: 12 })).toBe("Speed +23 · 12 s early");
    expect(translate("de", "board.week", { n: 45 })).toBe("Woche 45");
  });

  it("tarayıcı dilinden destekleneni seçer, yoksa Türkçe", () => {
    expect(detectLocale(["fr-FR", "de-DE", "en"])).toBe("de");
    expect(detectLocale(["en-US"])).toBe("en");
    expect(detectLocale(["fr", "es"])).toBe("tr");
  });
});
