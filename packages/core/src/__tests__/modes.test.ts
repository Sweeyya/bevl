import { describe, expect, it } from "vitest";
import {
  buildCameraPathForMode,
  buildCarouselPath,
  buildLinearPath,
  buildOrbitalPath,
  buildRoomPath,
  linearSectionPositions,
  sectionPositionsForMode,
} from "../camera/modes.js";

function approx(a: number, b: number, eps = 0.001): boolean {
  return Math.abs(a - b) < eps;
}

describe("buildLinearPath", () => {
  it("first pose is at positive Z (in front of section 0)", () => {
    const path = buildLinearPath(3, 10, 6);
    const p = path.lerp(0).position;
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
    expect(p.z).toBe(6);
  });

  it("last pose moves in -Z direction", () => {
    const path = buildLinearPath(3, 10, 6);
    const last = path.lerp(1).position;
    expect(last.z).toBeLessThan(0);
  });

  it("lerp(0.5) is between first and last", () => {
    const path = buildLinearPath(3, 10, 6);
    const mid = path.lerp(0.5).position;
    expect(mid.z).toBeLessThan(6);
    expect(mid.z).toBeGreaterThan(path.lerp(1).position.z);
  });

  it("quaternion stays at identity (no roll, no yaw)", () => {
    const path = buildLinearPath(3);
    const q = path.lerp(0).quaternion;
    expect(q.w).toBeCloseTo(1, 3);
    expect(q.x).toBeCloseTo(0, 3);
    expect(q.y).toBeCloseTo(0, 3);
    expect(q.z).toBeCloseTo(0, 3);
  });
});

describe("linearSectionPositions", () => {
  it("first section is at z=0", () => {
    const pos = linearSectionPositions(3, 10);
    const p = pos[0];
    expect(p?.x).toBe(0);
    expect(p?.y).toBe(0);
    expect(Object.is(p?.z, -0) || p?.z === 0).toBe(true);
  });

  it("sections are spaced by sectionSpacing along -Z", () => {
    const pos = linearSectionPositions(3, 10);
    expect(pos[1]?.z).toBe(-10);
    expect(pos[2]?.z).toBe(-20);
  });
});

describe("buildOrbitalPath", () => {
  it("produces one pose per section", () => {
    const path = buildOrbitalPath(4, 8);
    // 4 sections → 4 waypoints; lerp(0) and lerp(1) are distinct
    const p0 = path.lerp(0).position;
    const p1 = path.lerp(1).position;
    // For 4 sections the last lerp(1) = pose[3], which wraps back toward pose[0]
    // but is not identical to it
    expect(p0).not.toEqual(p1);
  });

  it("camera stays on the sphere surface (distance = radius)", () => {
    const radius = 8;
    const path = buildOrbitalPath(4, radius);
    const p = path.lerp(0).position;
    const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    expect(approx(dist, radius, 0.1)).toBe(true);
  });

  it("camera looks toward the origin (forward vector points inward)", () => {
    const path = buildOrbitalPath(4, 8);
    const pose = path.lerp(0);
    const q = pose.quaternion;
    const pos = pose.position;
    // Rotate world forward (0,0,-1) by quaternion to get camera forward
    // Using q * (0,0,-1) * q^-1
    const fwdX = 2 * (q.x * q.z + q.w * q.y);
    const fwdZ = -(1 - 2 * (q.x * q.x + q.y * q.y));
    // Direction from camera to origin
    const toOriginX = -pos.x;
    const toOriginZ = -pos.z;
    const len = Math.sqrt(toOriginX * toOriginX + toOriginZ * toOriginZ);
    const dot = (fwdX * toOriginX + fwdZ * toOriginZ) / len;
    expect(dot).toBeGreaterThan(0.5);
  });
});

describe("buildCarouselPath", () => {
  it("camera rotates — adjacent poses have different positions", () => {
    const path = buildCarouselPath(4, 6);
    const p0 = path.lerp(0).position;
    const p1 = path.lerp(1 / 3).position;
    expect(p0.x).not.toBeCloseTo(p1.x, 1);
  });

  it("camera stays at cameraRadius", () => {
    const radius = 6;
    const path = buildCarouselPath(4, radius);
    const p = path.lerp(0).position;
    const dist = Math.sqrt(p.x * p.x + p.z * p.z);
    expect(approx(dist, radius, 0.1)).toBe(true);
  });
});

describe("buildRoomPath", () => {
  it("camera stays at the origin for every waypoint", () => {
    const path = buildRoomPath(4);
    for (const t of [0, 0.33, 0.66, 1]) {
      const p = path.lerp(t).position;
      // Position interpolates between origin waypoints — should be very close to 0
      expect(Math.abs(p.x)).toBeLessThan(0.1);
      expect(Math.abs(p.y)).toBeLessThan(0.1);
      expect(Math.abs(p.z)).toBeLessThan(0.1);
    }
  });

  it("quaternions differ between sections (camera turns)", () => {
    const path = buildRoomPath(4);
    const q0 = path.lerp(0).quaternion;
    const q1 = path.lerp(1).quaternion;
    // Not the same rotation
    const same = q0.x === q1.x && q0.y === q1.y && q0.z === q1.z && q0.w === q1.w;
    expect(same).toBe(false);
  });
});

describe("buildCameraPathForMode dispatcher", () => {
  it("linear mode gives same result as buildLinearPath", () => {
    const a = buildCameraPathForMode({ mode: "linear", sectionCount: 3 });
    const b = buildLinearPath(3);
    expect(a.lerp(0).position).toEqual(b.lerp(0).position);
  });

  it("orbital mode gives same result as buildOrbitalPath", () => {
    const a = buildCameraPathForMode({ mode: "orbital", sectionCount: 3 });
    const b = buildOrbitalPath(3);
    expect(a.lerp(0).position).toEqual(b.lerp(0).position);
  });

  it("carousel mode gives same result as buildCarouselPath", () => {
    const a = buildCameraPathForMode({ mode: "carousel", sectionCount: 3 });
    const b = buildCarouselPath(3);
    expect(a.lerp(0).position).toEqual(b.lerp(0).position);
  });

  it("room mode gives same result as buildRoomPath", () => {
    const a = buildCameraPathForMode({ mode: "room", sectionCount: 3 });
    const b = buildRoomPath(3);
    expect(a.lerp(0).position).toEqual(b.lerp(0).position);
  });
});

describe("sectionPositionsForMode", () => {
  it("returns one position per section for all modes", () => {
    for (const mode of ["linear", "orbital", "carousel", "room"] as const) {
      const positions = sectionPositionsForMode({ mode, sectionCount: 4 });
      expect(positions).toHaveLength(4);
    }
  });

  it("linear positions match linearSectionPositions", () => {
    const a = sectionPositionsForMode({ mode: "linear", sectionCount: 3 });
    const b = linearSectionPositions(3);
    expect(a).toEqual(b);
  });
});
