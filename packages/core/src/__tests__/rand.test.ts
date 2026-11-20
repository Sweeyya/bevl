import { describe, expect, it } from "vitest";
import { makeRand } from "../rand.js";

describe("makeRand", () => {
  it("returns values in [0, 1)", () => {
    const rand = makeRand(1);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("same seed produces same sequence", () => {
    const a = makeRand(42);
    const b = makeRand(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = makeRand(1);
    const b = makeRand(2);
    const valuesA = Array.from({ length: 10 }, () => a());
    const valuesB = Array.from({ length: 10 }, () => b());
    expect(valuesA).not.toEqual(valuesB);
  });
});
