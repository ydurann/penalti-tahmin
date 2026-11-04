import { describe, expect, it } from "vitest";
import { ALL_COUNTRY_CODES, countryCode } from "./countries";

describe("countryCode", () => {
  it("StatsBomb adlarını ve Türkçe adları eşler, Britanya ülkelerini alt kodla verir", () => {
    expect(countryCode("Argentina")).toBe("ar");
    expect(countryCode("Côte d'Ivoire")).toBe("ci");
    expect(countryCode("Congo DR")).toBe("cd");
    expect(countryCode("Cape Verde Islands")).toBe("cv");
    expect(countryCode("England")).toBe("gb-eng");
    expect(countryCode("Türkiye")).toBe("tr");
    expect(countryCode("Turkey")).toBe("tr");
    expect(countryCode("İspanya")).toBe("es");
  });

  it("kulüp adlarında null döner", () => {
    expect(countryCode("Galatasaray")).toBeNull();
    expect(countryCode("Fenerbahçe")).toBeNull();
  });

  it("havuzdaki 67 milli takımın hepsini tanır", () => {
    const pool = ["Algeria", "Angola", "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Burkina Faso", "Canada", "Cape Verde Islands", "Colombia", "Congo DR", "Costa Rica", "Côte d'Ivoire", "Croatia", "Czech Republic", "Denmark", "Ecuador", "Egypt", "England", "Equatorial Guinea", "Finland", "France", "Georgia", "Germany", "Ghana", "Guinea", "Hungary", "Iceland", "Iran", "Italy", "Jamaica", "Japan", "Mali", "Mauritania", "Mexico", "Morocco", "Mozambique", "Namibia", "Netherlands", "Nigeria", "North Macedonia", "Panama", "Paraguay", "Peru", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Scotland", "Senegal", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Tunisia", "Turkey", "Ukraine", "United States", "Uruguay", "Venezuela", "Wales"];
    const missing = pool.filter((name) => countryCode(name) === null);
    expect(missing).toEqual([]);
    expect(ALL_COUNTRY_CODES.length).toBeGreaterThan(100);
  });
});
