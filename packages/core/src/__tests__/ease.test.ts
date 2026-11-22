import { describe, expect, it } from "vitest";
import { EASES, ease } from "../choreography/ease.js";

describe("ease", () => {
  it("every ease maps 0 to 0 and 1 to 1", () => {
    for (const fn of Object.values(EASES)) {
      expect(fn(0)).toBeCloseTo(0, 10);
      expect(fn(1)).toBeCloseTo(1, 10);
    }
  });

  it("midpoints match the formulas", () => {
    expect(EASES.linear(0.25)).toBe(0.25);
    expect(EASES.smooth(0.5)).toBe(0.5);
    expect(EASES.smooth(0.25)).toBeCloseTo(0.15625, 10);
    expect(EASES.easeIn(0.5)).toBeCloseTo(0.125, 10);
    expect(EASES.easeOut(0.5)).toBeCloseTo(0.875, 10);
    expect(EASES.easeInOut(0.25)).toBeCloseTo(0.0625, 10);
    expect(EASES.easeInOut(0.75)).toBeCloseTo(0.9375, 10);
  });

  it("defaults to smooth and clamps t", () => {
    expect(ease(undefined, 0.25)).toBe(EASES.smooth(0.25));
    expect(ease("linear", -1)).toBe(0);
    expect(ease("linear", 2)).toBe(1);
  });
});
