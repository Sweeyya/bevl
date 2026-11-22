import { describe, expect, it } from "vitest";
import { angleDeg, distance } from "../drive.js";

const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

describe("drive math", () => {
  it("measures distance between points", () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
  });

  it("measures the turn between two orientations", () => {
    const half = Math.SQRT1_2;
    expect(angleDeg(IDENTITY, IDENTITY)).toBeCloseTo(0, 5);
    expect(angleDeg(IDENTITY, { x: 0, y: half, z: 0, w: half })).toBeCloseTo(90, 5);
  });

  it("treats opposite quaternion signs as the same orientation", () => {
    expect(angleDeg(IDENTITY, { x: 0, y: 0, z: 0, w: -1 })).toBeCloseTo(0, 5);
  });
});
