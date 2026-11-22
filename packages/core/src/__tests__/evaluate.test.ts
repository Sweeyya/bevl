import { describe, expect, it } from "vitest";
import { evaluateTrack } from "../choreography/evaluate.js";
import type { Track, Vec3Tuple } from "../choreography/types.js";

const num: Track = {
  target: "box",
  prop: "material.opacity",
  keys: [
    { at: 0.2, value: 0 },
    { at: 0.6, value: 10, ease: "linear" },
  ],
};

describe("evaluateTrack", () => {
  it("lerps numbers", () => {
    expect(evaluateTrack(num, 0.4)).toBeCloseTo(5, 10);
    expect(evaluateTrack(num, 0.3)).toBeCloseTo(2.5, 10);
  });

  it("clamps before the first and after the last key", () => {
    expect(evaluateTrack(num, 0)).toBe(0);
    expect(evaluateTrack(num, 1)).toBe(10);
  });

  it("uses the ending key's ease, default smooth", () => {
    const smooth: Track = {
      ...num,
      keys: [num.keys[0] ?? { at: 0, value: 0 }, { at: 0.6, value: 10 }],
    };
    expect(evaluateTrack(smooth, 0.3)).toBeCloseTo(10 * 0.15625, 10);
    const easeIn: Track = {
      ...num,
      keys: [
        { at: 0, value: 0 },
        { at: 1, value: 1, ease: "easeIn" },
      ],
    };
    expect(evaluateTrack(easeIn, 0.5)).toBeCloseTo(0.125, 10);
  });

  it("picks the right segment with several keys", () => {
    const t: Track = {
      target: "x",
      prop: "rotation.y",
      keys: [
        { at: 0, value: 0 },
        { at: 0.5, value: 1, ease: "linear" },
        { at: 1, value: 3, ease: "linear" },
      ],
    };
    expect(evaluateTrack(t, 0.25)).toBeCloseTo(0.5, 10);
    expect(evaluateTrack(t, 0.5)).toBeCloseTo(1, 10);
    expect(evaluateTrack(t, 0.75)).toBeCloseTo(2, 10);
  });

  it("lerps Vec3 linearly", () => {
    const t: Track = {
      target: "camera",
      prop: "position",
      keys: [
        { at: 0, value: [0, 0, 0] },
        { at: 1, value: [2, 4, -6], ease: "linear" },
      ],
    };
    const v = evaluateTrack(t, 0.5) as Vec3Tuple;
    expect(v[0]).toBeCloseTo(1, 10);
    expect(v[1]).toBeCloseTo(2, 10);
    expect(v[2]).toBeCloseTo(-3, 10);
  });

  it("curve passes through every key and bends between them", () => {
    const points: Vec3Tuple[] = [
      [0, 0, 0],
      [5, 0, -5],
      [0, 0, -10],
      [-5, 2, -15],
    ];
    const t: Track = {
      target: "camera",
      prop: "position",
      path: "curve",
      keys: points.map((value, i) => ({ at: i / 3, value, ease: "linear" as const })),
    };
    points.forEach((p, i) => {
      const v = evaluateTrack(t, i / 3) as Vec3Tuple;
      for (let a = 0; a < 3; a++) expect(v[a]).toBeCloseTo(p[a] ?? 0, 10);
    });
    const mid = evaluateTrack(t, 0.5) as Vec3Tuple;
    expect(mid[0]).toBeGreaterThan(2.5);
    const linear = evaluateTrack({ ...t, path: "linear" }, 0.5) as Vec3Tuple;
    expect(linear[0]).toBeCloseTo(2.5, 10);
  });

  it("interpolates colors in RGB and returns hex", () => {
    const t: Track = {
      target: "box",
      prop: "material.color",
      keys: [
        { at: 0, value: "#000000" },
        { at: 1, value: "#ff8000", ease: "linear" },
      ],
    };
    expect(evaluateTrack(t, 0)).toBe("#000000");
    expect(evaluateTrack(t, 0.5)).toBe("#804000");
    expect(evaluateTrack(t, 1)).toBe("#ff8000");
  });

  it("is a pure function of progress", () => {
    expect(evaluateTrack(num, 0.37)).toBe(evaluateTrack(num, 0.37));
  });
});
