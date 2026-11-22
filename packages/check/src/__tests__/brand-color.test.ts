import { describe, expect, it } from "vitest";
import { deltaE, hexToLab, isNeutral } from "../rules/brand/color.js";

describe("brand color math", () => {
  it("converts white and black to Lab", () => {
    expect(hexToLab("#ffffff")?.[0]).toBeCloseTo(100, 0);
    expect(hexToLab("#000000")?.[0]).toBeCloseTo(0, 0);
  });

  it("measures distance", () => {
    expect(deltaE("#e63946", "#e63946")).toBe(0);
    expect(deltaE("#e63946", "#e83a47")).toBeLessThan(2);
    expect(deltaE("#e63946", "#2a9d8f")).toBeGreaterThan(50);
    expect(deltaE("#e63946", "red")).toBe(Number.POSITIVE_INFINITY);
  });

  it("treats black, white and gray as neutral", () => {
    for (const c of ["#000000", "#0a0a0a", "#ffffff", "#808080"]) expect(isNeutral(c)).toBe(true);
    expect(isNeutral("#e63946")).toBe(false);
  });
});
