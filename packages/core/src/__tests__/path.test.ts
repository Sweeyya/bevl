import { describe, expect, it } from "vitest";
import { clampStep, enforceNoRoll } from "../camera/path.js";
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

describe("enforceNoRoll", () => {
  it("brings a 45° rolled camera up vector within 2° of world up", () => {
    const rolledQ = rollQuat(45);
    const corrected = enforceNoRoll(rolledQ, DESIGN_RULES.MAX_ROLL_DEG);

    // Apply corrected quaternion to world-up and check the angle
    const ux = 2 * (corrected.x * corrected.y - corrected.w * corrected.z);
    const uy = 1 - 2 * (corrected.x * corrected.x + corrected.z * corrected.z);
    const uz = 2 * (corrected.y * corrected.z + corrected.w * corrected.x);
    const dot = Math.min(1, Math.max(-1, uy)); // dot with (0,1,0)
    const angleDeg = (Math.acos(dot) * 180) / Math.PI;

    // Suppress unused variable warning
    void ux;
    void uz;

    expect(angleDeg).toBeLessThanOrEqual(DESIGN_RULES.MAX_ROLL_DEG);
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
