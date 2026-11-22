/**
 * Camera motion limits applied per frame by components/ScrollCamera.tsx:
 * - Speed limit: the camera never moves more than MAX_MOVE_PER_STEP_M and never
 *   turns more than MAX_TURN_PER_STEP_DEG per step.
 * - No-roll: the camera up vector stays within MAX_ROLL_DEG of world up (0,1,0).
 */

import type { Pose, Quat, Vec3 } from "../contract.js";

/** Dot product of two quaternions */
function quatDot(a: Quat, b: Quat): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

/** Normalise a quaternion */
function quatNorm(q: Quat): Quat {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len < 1e-10) return { x: 0, y: 0, z: 0, w: 1 };
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

/** Spherical linear interpolation between two quaternions */
function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = quatDot(a, b);
  // Flip b if dot is negative so we take the short arc
  const bFlipped: Quat = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;
  dot = Math.abs(dot);

  if (dot > 0.9995) {
    // Near-identical quaternions: linear interpolation
    return quatNorm({
      x: a.x + t * (bFlipped.x - a.x),
      y: a.y + t * (bFlipped.y - a.y),
      z: a.z + t * (bFlipped.z - a.z),
      w: a.w + t * (bFlipped.w - a.w),
    });
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);
  const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return quatNorm({
    x: s0 * a.x + s1 * bFlipped.x,
    y: s0 * a.y + s1 * bFlipped.y,
    z: s0 * a.z + s1 * bFlipped.z,
    w: s0 * a.w + s1 * bFlipped.w,
  });
}

/** Apply a quaternion to the world-up vector (0,1,0) */
function quatApplyToUp(q: Quat): Vec3 {
  // Optimised: rotate (0,1,0) by q using q * v * q^-1
  const x = q.x;
  const y = q.y;
  const z = q.z;
  const w = q.w;
  // Result y column of rotation matrix built from quaternion
  return {
    x: 2 * (x * y - w * z),
    y: 1 - 2 * (x * x + z * z),
    z: 2 * (y * z + w * x),
  };
}

/**
 * Projects a quaternion onto the no-roll subspace, keeping the camera up
 * vector within maxDeg of world up (0,1,0). Returns the corrected quaternion.
 */
export function enforceNoRoll(q: Quat, maxDeg: number): Quat {
  const up = quatApplyToUp(q);
  // Angle between up and world-up
  const dot = Math.min(1, Math.max(-1, up.y)); // up · (0,1,0) = up.y
  const angleDeg = (Math.acos(dot) * 180) / Math.PI;

  if (angleDeg <= maxDeg) return q;

  // Build a yaw-only quaternion by zeroing the x and z components and
  // renormalising — this strips roll and pitch, keeping only yaw.
  // We preserve forward direction: extract yaw from the quaternion.
  // Forward direction from q is (-2*(x*z - w*y), -2*(y*z + w*x), -(1 - 2*(x*x + y*y)))
  // but easier: slerp toward the roll-free version by the excess fraction.
  const rollFreeQ = quatNorm({ x: 0, y: q.y, z: 0, w: q.w });

  // Blend toward the roll-free quaternion just enough to bring roll inside maxDeg
  const blendFactor = Math.min(1, (angleDeg - maxDeg) / angleDeg);
  return quatSlerp(q, rollFreeQ, blendFactor);
}

/**
 * Clamps a pose step so the camera:
 * - moves no more than maxMeters from prev.position to next.position
 * - turns no more than maxDeg from prev.quaternion to next.quaternion
 *
 * Matching scroll handler: components/ScrollCamera.tsx
 */
export function clampStep(prev: Pose, next: Pose, maxMeters: number, maxDeg: number): Pose {
  const dp = next.position;
  const pp = prev.position;
  const dx = dp.x - pp.x;
  const dy = dp.y - pp.y;
  const dz = dp.z - pp.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Clamp position
  const clampedPosition: Vec3 =
    dist > maxMeters && dist > 1e-10
      ? {
          x: pp.x + (dx / dist) * maxMeters,
          y: pp.y + (dy / dist) * maxMeters,
          z: pp.z + (dz / dist) * maxMeters,
        }
      : next.position;

  // Clamp rotation
  const dot = Math.min(1, Math.abs(quatDot(prev.quaternion, next.quaternion)));
  const angleDeg = (2 * Math.acos(dot) * 180) / Math.PI;

  const clampedQuaternion: Quat =
    angleDeg > maxDeg && angleDeg > 1e-10
      ? quatSlerp(prev.quaternion, next.quaternion, maxDeg / angleDeg)
      : next.quaternion;

  return { position: clampedPosition, quaternion: clampedQuaternion };
}
