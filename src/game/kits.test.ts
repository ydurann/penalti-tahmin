import { describe, expect, it } from "vitest";
import { keeperKitAgainst, kitFor } from "./kits";

describe("takım formaları", () => {
  it("bilinen takımın formasını verir", () => {
    expect(kitFor("Brazil").shirt).toBe("#f7d117");
    expect(kitFor("Türkiye")).toEqual(kitFor("Turkey"));
  });

  it("bilinmeyen takıma adından kararlı bir renk türetir", () => {
    const a = kitFor("Fenerbahçe");
    expect(a).toEqual(kitFor("Fenerbahçe"));
    expect(a.shirt).toMatch(/^#[0-9a-f]{6}$/);
    expect(a.shirt).not.toBe(kitFor("Galatasaray").shirt);
  });

  it("kaleci penaltıcının formasından ayrışır", () => {
    // Sarı formalı takıma karşı kaleci sarı giymez.
    expect(keeperKitAgainst(kitFor("Brazil")).shirt).not.toBe("#e0a526");
    expect(keeperKitAgainst(kitFor("France")).shirt).toBe("#e0a526");
  });
});
