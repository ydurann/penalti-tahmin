import { describe, expect, it } from "vitest";
import { teamInitials, teamSlug } from "./teams";

describe("teamSlug", () => {
  it("Türkçe ve aksanlı karakterleri sadeleştirir, boşluk ve noktalamayı tireye çevirir", () => {
    expect(teamSlug("Fenerbahçe")).toBe("fenerbahce");
    expect(teamSlug("Başakşehir FK")).toBe("basaksehir-fk");
    expect(teamSlug("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(teamSlug("Türkiye")).toBe("turkiye");
    expect(teamSlug("Congo DR")).toBe("congo-dr");
    expect(teamSlug("  Bosnia & Herzegovina ")).toBe("bosnia-herzegovina");
  });
});

describe("teamInitials", () => {
  it("tek kelimede üç harf, çok kelimede baş harfler; kulüp eklerini atlar", () => {
    expect(teamInitials("Argentina")).toBe("ARG");
    expect(teamInitials("Galatasaray")).toBe("GAL");
    expect(teamInitials("Başakşehir FK")).toBe("BAŞ");
    expect(teamInitials("Cape Verde Islands")).toBe("CVI");
    expect(teamInitials("Côte d'Ivoire")).toBe("CI");
    expect(teamInitials("Switzerland")).toBe("SWI");
    expect(teamInitials("İstanbulspor")).toBe("İST");
  });
});
