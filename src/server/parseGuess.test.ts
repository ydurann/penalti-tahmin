import { describe, expect, it } from "vitest";
import { parseGuess } from "./parseGuess";

describe("parseGuess", () => {
  it("bölge ve vuruş tipini kabul eder", () => {
    expect(parseGuess({ guess: { target: { col: 2, row: 0 }, shot: "power" } })).toEqual({
      target: { col: 2, row: 0 },
      shot: "power",
    });
  });

  it("dışarı hedefini kabul eder", () => {
    expect(parseGuess({ guess: { target: "out", shot: "placed" } })).toEqual({ target: "out", shot: "placed" });
  });

  it("süresi dolan turu null olarak geçirir", () => {
    expect(parseGuess({ guess: null })).toBeNull();
  });

  it("geçersiz gövdelerde undefined döner", () => {
    expect(parseGuess(undefined)).toBeUndefined();
    expect(parseGuess({})).toBeUndefined();
    expect(parseGuess({ guess: "out" })).toBeUndefined();
    expect(parseGuess({ guess: { target: "away", shot: "power" } })).toBeUndefined();
    expect(parseGuess({ guess: { target: { col: 3, row: 0 }, shot: "power" } })).toBeUndefined();
    expect(parseGuess({ guess: { target: { col: 1, row: 1 }, shot: "chip" } })).toBeUndefined();
    expect(parseGuess({ guess: { zone: { col: 1, row: 1 }, shot: "power" } })).toBeUndefined();
  });
});
