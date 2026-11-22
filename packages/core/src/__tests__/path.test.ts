import { describe, expect, it } from "vitest";
import { clampStep, enforceNoRoll, rollDegrees } from "../camera/path.js";
import type { Pose, Quat } from "../contract.js";
import { DESIGN_RULES } from "../index.js";

/** Identity quaternion — no rotation */
const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** Quaternion for a 45° roll (rotation around z-axis) */
function rollQuat(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
}

/** Quaternion for a 90° yaw (rotation around y-axis) */
function yawQuat(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function pitchQuat(deg: number): Quat {
  const half = (deg * Math.PI) / 360;
  return { x: Math.sin(half), y: 0, z: 0, w: Math.cos(half) };
}

function mul(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

function forward(q: Quat): [number, number, number] {
  return [
    -2 * (q.x * q.z + q.w * q.y),
    -2 * (q.y * q.z - q.w * q.x),
    -(1 - 2 * (q.x * q.x + q.y * q.y)),
  ];
}

const LIMIT = DESIGN_RULES.MAX_ROLL_DEG;

describe("rollDegrees", () => {
  it("is zero for any pure yaw, including turns past 90 degrees", () => {
    for (const deg of [0, 45, 90, 135, 180, 270])
      expect(rollDegrees(yawQuat(deg))).toBeCloseTo(0, 6);
  });
  it("is zero for pitch and for yaw combined with pitch", () => {
    expect(rollDegrees(pitchQuat(40))).toBeCloseTo(0, 6);
    expect(rollDegrees(mul(yawQuat(200), pitchQuat(-35)))).toBeCloseTo(0, 6);
  });
  it("measures real roll", () => {
    expect(rollDegrees(rollQuat(30))).toBeCloseTo(30, 6);
  });
});

describe("enforceNoRoll", () => {
  it("removes a 45 degree roll", () => {
    expect(rollDegrees(enforceNoRoll(rollQuat(45), LIMIT))).toBeLessThanOrEqual(LIMIT);
  });
  it("leaves quaternions inside the limit untouched", () => {
    const q = rollQuat(1);
    expect(enforceNoRoll(q, LIMIT)).toBe(q);
  });
  it("keeps the pitch and yaw of a pitched camera instead of flattening it", () => {
    const q = mul(yawQuat(120), pitchQuat(-46));
    const out = enforceNoRoll(q, LIMIT);
    expect(out).toBe(q);
    const rolled = mul(q, rollQuat(25));
    const fixed = enforceNoRoll(rolled, LIMIT);
    expect(rollDegrees(fixed)).toBeLessThanOrEqual(LIMIT);
    const [fx, fy, fz] = forward(fixed);
    const [qx, qy, qz] = forward(rolled);
    expect(fx * qx + fy * qy + fz * qz).toBeCloseTo(1, 5);
  });
  it("leaves a camera looking straight up or down alone", () => {
    const q = pitchQuat(90);
    expect(Number.isFinite(enforceNoRoll(mul(q, rollQuat(20)), LIMIT).w)).toBe(true);
  });
});

describe("clampStep", () => {
  it("clamps a 10 m move to MAX_MOVE_PER_STEP_M", () => {
    const prev: Pose = { position: { x: 0, y: 0, z: 0 }, quaternion: IDENTITY };
    const next: Pose = { position: { x: 10, y: 0, z: 0 }, quaternion: IDENTITY };
    const result = clampStep(
      prev,
      next,
      DESIGN_RULES.MAX_MOVE_PER_STEP_M,
      DESIGN_RULES.MAX_TURN_PER_STEP_DEG,
    );
    const dx = result.position.x - prev.position.x;
    const dy = result.position.y - prev.position.y;
    const dz = result.position.z - prev.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(dist).toBeCloseTo(DESIGN_RULES.MAX_MOVE_PER_STEP_M, 5);
  });

  it("clamps a 90° yaw turn to MAX_TURN_PER_STEP_DEG", () => {
    const prev: Pose = { position: { x: 0, y: 0, z: 0 }, quaternion: IDENTITY };
    const next: Pose = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: yawQuat(90),
    };
    const result = clampStep(
      prev,
      next,
      DESIGN_RULES.MAX_MOVE_PER_STEP_M,
      DESIGN_RULES.MAX_TURN_PER_STEP_DEG,
    );

    // Measure the angle between prev and result quaternions
    const dot = Math.min(
      1,
      Math.abs(
        prev.quaternion.x * result.quaternion.x +
          prev.quaternion.y * result.quaternion.y +
          prev.quaternion.z * result.quaternion.z +
          prev.quaternion.w * result.quaternion.w,
      ),
    );
    const angleDeg = (2 * Math.acos(dot) * 180) / Math.PI;
    expect(angleDeg).toBeCloseTo(DESIGN_RULES.MAX_TURN_PER_STEP_DEG, 3);
  });
});
