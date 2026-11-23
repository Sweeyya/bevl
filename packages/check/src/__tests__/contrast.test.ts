import { describe, expect, it } from "vitest";
import {
  backingPanelColor,
  contrastRatio,
  hexToRgb,
  requiredRatio,
  suggestedColor,
} from "../contrast.js";

describe("contrast math", () => {
  it("gives 21 for black on white and 1 for identical colors", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([120, 120, 120], [120, 120, 120])).toBe(1);
  });

  it("matches the known value for #777 on white", () => {
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it("suggests the readable extreme", () => {
    expect(suggestedColor([250, 250, 250])).toBe("#000000");
    expect(suggestedColor([10, 10, 30])).toBe("#ffffff");
  });

  it("asks 3:1 only for large text", () => {
    expect(requiredRatio(24, 400)).toBe(3);
    expect(requiredRatio(19, 700)).toBe(3);
    expect(requiredRatio(14, 700)).toBe(4.5);
  });

  it("builds a 0.75 backing panel from the brand surface that reads best", () => {
    const text = hexToRgb("#f6ede3");
    const surface = hexToRgb("#2a1f18");
    const bg = hexToRgb("#1b1410");
    if (!text || !surface || !bg) throw new Error("bad hex");
    expect(backingPanelColor(text, [surface, bg], [200, 200, 200])).toBe("rgba(27, 20, 16, 0.75)");
    expect(backingPanelColor(text, [], [10, 20, 30])).toBe("rgba(10, 20, 30, 0.75)");
    expect(hexToRgb("nope")).toBeNull();
  });
});
