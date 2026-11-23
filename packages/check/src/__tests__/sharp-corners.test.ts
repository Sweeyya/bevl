import { describe, expect, it } from "vitest";
import { hasRadius } from "../rules/brand/sharp-corners.js";

describe("hasRadius", () => {
  it("is false for square corners", () => {
    expect(hasRadius(["0px", "0px", "0px", "0px"])).toBe(false);
    expect(hasRadius(["0px 0px", "0%", "0px", "0px"])).toBe(false);
  });

  it("is true when any corner is rounded", () => {
    expect(hasRadius(["0px", "0px", "4px", "0px"])).toBe(true);
    expect(hasRadius(["50%", "50%", "50%", "50%"])).toBe(true);
    expect(hasRadius(["12px 0px", "0px", "0px", "0px"])).toBe(true);
    expect(hasRadius(["0.5px", "0px", "0px", "0px"])).toBe(true);
  });
});
