import { describe, expect, it } from "vitest";
import { addAd, moveAd, publicAds, removeAd, updateAd, validateAdText, type Ad, type AdStore } from "./ads";

const ad = (id: string, extra: Partial<Ad> = {}): Ad => ({
  id,
  text: `Reklam ${id}`,
  image: null,
  enabled: true,
  createdAt: 0,
  ...extra,
});

describe("reklam doğrulama", () => {
  it("yazıyı kırpar ve boşlukları sadeleştirir", () => {
    expect(validateAdText("  Büyük   indirim  ", false)).toEqual({ ok: true, text: "Büyük indirim" });
  });

  it("yazı ya da görselden biri olmalıdır", () => {
    expect(validateAdText("", false).ok).toBe(false);
    expect(validateAdText("", true)).toEqual({ ok: true, text: "" });
  });

  it("çok uzun yazıyı reddeder", () => {
    expect(validateAdText("a".repeat(81), false).ok).toBe(false);
  });
});

describe("reklam deposu", () => {
  const store: AdStore = { ads: [ad("a"), ad("b", { enabled: false }), ad("c", { image: "c.png" })] };

  it("ekler, günceller ve siler", () => {
    expect(addAd(store, ad("d")).ads.map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(updateAd(store, "b", { enabled: true }).ads[1].enabled).toBe(true);
    expect(removeAd(store, "a").ads.map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("sırayı taşır, uçlarda değişmez", () => {
    expect(moveAd(store, "c", -1).ads.map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moveAd(store, "a", -1)).toBe(store);
    expect(moveAd(store, "c", 1)).toBe(store);
  });

  it("oyuna yalnızca açık reklamlar görsel adresiyle gider", () => {
    expect(publicAds(store)).toEqual([
      { id: "a", text: "Reklam a", imageUrl: null },
      { id: "c", text: "Reklam c", imageUrl: "/api/ads/c/image" },
    ]);
  });
});
