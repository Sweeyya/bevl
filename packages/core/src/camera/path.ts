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

/** Roll in degrees: how far the camera's right vector tilts out of the horizontal plane. Pitch and yaw do not change it. */
export function rollDegrees(q: Quat): number {
  const rightY = 2 * (q.x * q.y + q.w * q.z);
  return (Math.asin(Math.min(1, Math.abs(rightY))) * 180) / Math.PI;
}

/** Quaternion for a camera looking along `forward` with world up (0,1,0); null when forward is vertical. */
function lookAlong(forward: Vec3): Quat | null {
  const fl = Math.hypot(forward.x, forward.y, forward.z);
  if (fl < 1e-10) return null;
  const f = { x: forward.x / fl, y: forward.y / fl, z: forward.z / fl };
  // right = f x worldUp
  const rx = -f.z;
  const rz = f.x;
  const rl = Math.hypot(rx, rz);
  if (rl < 1e-6) return null;
  const r = { x: rx / rl, y: 0, z: rz / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  // rotation matrix with columns right, up, -forward
  const m00 = r.x;
  const m10 = r.y;
  const m20 = r.z;
  const m01 = u.x;
  const m11 = u.y;
  const m21 = u.z;
  const m02 = -f.x;
  const m12 = -f.y;
  const m22 = -f.z;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const t = Math.sqrt(trace + 1) * 2;
    return quatNorm({ w: t / 4, x: (m21 - m12) / t, y: (m02 - m20) / t, z: (m10 - m01) / t });
  }
  if (m00 > m11 && m00 > m22) {
    const t = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return quatNorm({ w: (m21 - m12) / t, x: t / 4, y: (m01 + m10) / t, z: (m02 + m20) / t });
  }
  if (m11 > m22) {
    const t = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return quatNorm({ w: (m02 - m20) / t, x: (m01 + m10) / t, y: t / 4, z: (m12 + m21) / t });
  }
  const t = Math.sqrt(1 + m22 - m00 - m11) * 2;
  return quatNorm({ w: (m10 - m01) / t, x: (m02 + m20) / t, y: (m12 + m21) / t, z: t / 4 });
}

/**
 * Keeps camera roll within maxDeg. Over the limit, the camera keeps looking the same way
 * (so pitch and yaw are untouched) and is re-leveled against world up.
 */
export function enforceNoRoll(q: Quat, maxDeg: number): Quat {
  if (rollDegrees(q) <= maxDeg) return q;
  const forward = {
    x: -2 * (q.x * q.z + q.w * q.y),
    y: -2 * (q.y * q.z - q.w * q.x),
    z: -(1 - 2 * (q.x * q.x + q.y * q.y)),
  };
  return lookAlong(forward) ?? q;
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
