import { describe, expect, it } from "vitest";
import { ballStyleFor, CLASSIC_BALL } from "./ballStyles";

describe("turnuva topu", () => {
  it("turnuva ve sezona göre stil seçer", () => {
    expect(ballStyleFor({ competition: "FIFA World Cup", season: "2022" }).id).toBe("wc2022");
    expect(ballStyleFor({ competition: "UEFA Euro", season: "2024" }).id).toBe("euro2024");
  });

  it("sezon eşleşmezse turnuvaya, o da yoksa klasik topa düşer", () => {
    expect(ballStyleFor({ competition: "Women's World Cup", season: "2019" }).id).toBe("wwc");
    expect(ballStyleFor({ competition: "Süper Lig", season: "2025/26" }).id).toBe("superlig");
    expect(ballStyleFor({ competition: "La Liga", season: "2025/26" })).toBe(CLASSIC_BALL);
    expect(ballStyleFor(undefined)).toBe(CLASSIC_BALL);
  });
});
