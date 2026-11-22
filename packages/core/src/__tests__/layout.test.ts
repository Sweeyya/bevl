import { describe, expect, it } from "vitest";
import { layoutPositions } from "../choreography/layout.js";
import type { LayoutArrange, Vec3Tuple } from "../choreography/types.js";

function dist(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("layoutPositions", () => {
  it("returns one placement per child for every arrange", () => {
    const arranges: LayoutArrange[] = ["line", "grid", "ring", "onSphere", "alongPath"];
    for (const arrange of arranges) {
      const points: Vec3Tuple[] = [
        [0, 0, 0],
        [0, 0, -10],
      ];
      expect(layoutPositions({ arrange, points }, 7)).toHaveLength(7);
      expect(layoutPositions({ arrange, points }, 0)).toHaveLength(0);
    }
  });

  it("line follows direction and spacing", () => {
    const p = layoutPositions({ arrange: "line", spacing: 10 }, 3).map((x) => x.position);
    expect(p[2]).toEqual([0, 0, -20]);
    const x = layoutPositions({ arrange: "line", spacing: 3, direction: [2, 0, 0] }, 2);
    expect(x[1]?.position).toEqual([3, 0, 0]);
  });

  it("grid is centered with the given columns", () => {
    const p = layoutPositions({ arrange: "grid", columns: 2, spacing: 2 }, 4).map(
      (x) => x.position,
    );
    expect(p).toEqual([
      [-1, 1, 0],
      [1, 1, 0],
      [-1, -1, 0],
      [1, -1, 0],
    ]);
  });

  it("ring puts every child on the radius around the center", () => {
    const center: Vec3Tuple = [1, 2, 3];
    for (const { position } of layoutPositions({ arrange: "ring", radius: 4, center }, 6)) {
      expect(dist(position, center)).toBeCloseTo(4, 10);
      expect(position[1]).toBe(2);
    }
  });

  it("onSphere puts every child on the radius and spreads them out", () => {
    const placements = layoutPositions({ arrange: "onSphere", radius: 3 }, 20);
    for (const { position } of placements) expect(dist(position, [0, 0, 0])).toBeCloseTo(3, 10);
    const ys = placements.map((p) => p.position[1]);
    expect(Math.max(...ys)).toBeGreaterThan(2);
    expect(Math.min(...ys)).toBeLessThan(-2);
  });

  it("inward facing looks at the center, outward away from it", () => {
    const center: Vec3Tuple = [0, 1, 0];
    for (const p of layoutPositions({ arrange: "onSphere", facing: "inward", center }, 5)) {
      expect(p.lookAt).toEqual(center);
    }
    const [out] = layoutPositions({ arrange: "ring", radius: 2, facing: "outward" }, 1);
    expect(out?.lookAt).toEqual([0, 0, 4]);
    expect(layoutPositions({ arrange: "ring" }, 1)[0]?.lookAt).toBeUndefined();
  });

  it("alongPath spaces children evenly from first to last point", () => {
    const points: Vec3Tuple[] = [
      [0, 0, 0],
      [0, 0, -10],
    ];
    const p = layoutPositions({ arrange: "alongPath", points }, 3).map((x) => x.position);
    expect(dist(p[0] ?? [9, 9, 9], [0, 0, 0])).toBeCloseTo(0, 6);
    expect(dist(p[1] ?? [9, 9, 9], [0, 0, -5])).toBeCloseTo(0, 6);
    expect(dist(p[2] ?? [9, 9, 9], [0, 0, -10])).toBeCloseTo(0, 6);
  });
});
