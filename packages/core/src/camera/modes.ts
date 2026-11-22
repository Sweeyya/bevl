/**
 * Camera path builders for each CameraMode.
 *
 * Every builder takes a section count and returns a CameraPath.
 * The path is consumed by ScrollCamera via cameraPath.lerp(scrollProgress).
 *
 * Sections are placed in world space by Section.tsx using the same geometry
 * helpers exported here, so sections and camera poses always match.
 */

import type { CameraMode, Pose, Quat, Vec3 } from "../contract.js";
import { CameraPath } from "./path.js";

// ─── Shared math ─────────────────────────────────────────────────────────────

function quatFromAxisAngle(axis: Vec3, rad: number): Quat {
  const s = Math.sin(rad / 2);
  const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
  if (len < 1e-10) return { x: 0, y: 0, z: 0, w: 1 };
  return {
    x: (axis.x / len) * s,
    y: (axis.y / len) * s,
    z: (axis.z / len) * s,
    w: Math.cos(rad / 2),
  };
}

function quatMul(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

/** Quaternion that makes the camera look from `from` toward the origin, up = world Y */
function lookAtOrigin(from: Vec3): Quat {
  const dx = -from.x;
  const dy = -from.y;
  const dz = -from.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-10) return { x: 0, y: 0, z: 0, w: 1 };

  // Yaw: angle around Y to face the origin in XZ
  const yaw = Math.atan2(-dx / len, -dz / len);
  const qYaw = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, yaw);

  // Pitch: angle down/up
  const pitch = Math.asin(dy / len);
  const qPitch = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, pitch);

  return quatMul(qYaw, qPitch);
}

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

// ─── Linear ──────────────────────────────────────────────────────────────────

/**
 * Camera flies forward along -Z. Each section gets one waypoint.
 * sectionSpacing: world-unit distance between sections (default 10).
 * cameraOffset: how far in front of each section the camera sits (default 6).
 */
export function buildLinearPath(
  sectionCount: number,
  sectionSpacing = 10,
  cameraOffset = 6,
): CameraPath {
  const count = Math.max(1, sectionCount);
  const poses: Pose[] = Array.from({ length: count }, (_, i) => ({
    position: { x: 0, y: 0, z: -i * sectionSpacing + cameraOffset },
    quaternion: IDENTITY,
  }));
  return new CameraPath(poses);
}

/** World positions of sections for linear mode — matches the camera path above */
export function linearSectionPositions(sectionCount: number, sectionSpacing = 10): Vec3[] {
  return Array.from({ length: sectionCount }, (_, i) => ({
    x: 0,
    y: 0,
    z: -i * sectionSpacing,
  }));
}

// ─── Orbital ─────────────────────────────────────────────────────────────────

/**
 * Camera orbits the origin on the inside of a sphere.
 * Sections are evenly distributed along a great circle in the XZ plane,
 * facing inward. The camera sits at radius r, looking at the origin.
 *
 * Your sphere-of-screens idea: set radius large enough that sections feel
 * like panels on the inside of a dome.
 */
export function buildOrbitalPath(sectionCount: number, radius = 8): CameraPath {
  const count = Math.max(1, sectionCount);
  const poses: Pose[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const pos: Vec3 = {
      x: Math.sin(angle) * radius,
      y: 0,
      z: Math.cos(angle) * radius,
    };
    return { position: pos, quaternion: lookAtOrigin(pos) };
  });
  return new CameraPath(poses);
}

/** World positions of sections for orbital mode — placed on the sphere surface facing inward */
export function orbitalSectionPositions(sectionCount: number, radius = 8): Vec3[] {
  const count = Math.max(1, sectionCount);
  // Sections sit slightly inside the sphere so the camera sees them
  const sectionRadius = radius * 0.4;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x: Math.sin(angle) * sectionRadius,
      y: 0,
      z: Math.cos(angle) * sectionRadius,
    };
  });
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

/**
 * Sections arranged in a ring; camera stays at a fixed radius and rotates
 * to face each one in turn. Like a spinning record of screens.
 *
 * cameraRadius: how far the camera sits from the center.
 * sectionRadius: how far sections sit from the center (should be < cameraRadius).
 */
export function buildCarouselPath(sectionCount: number, cameraRadius = 6): CameraPath {
  const count = Math.max(1, sectionCount);
  const poses: Pose[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const pos: Vec3 = {
      x: Math.sin(angle) * cameraRadius,
      y: 0,
      z: Math.cos(angle) * cameraRadius,
    };
    // Camera looks toward the center
    return { position: pos, quaternion: lookAtOrigin(pos) };
  });
  return new CameraPath(poses);
}

/** World positions of sections for carousel mode — ring at a smaller radius */
export function carouselSectionPositions(sectionCount: number, sectionRadius = 3): Vec3[] {
  const count = Math.max(1, sectionCount);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x: Math.sin(angle) * sectionRadius,
      y: 0,
      z: Math.cos(angle) * sectionRadius,
    };
  });
}

// ─── Room ─────────────────────────────────────────────────────────────────────

const ROOM_FACES: Array<{ pos: Vec3; rot: Quat }> = [
  // Front wall
  { pos: { x: 0, y: 0, z: -5 }, rot: IDENTITY },
  // Right wall
  {
    pos: { x: 5, y: 0, z: 0 },
    rot: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2),
  },
  // Back wall
  {
    pos: { x: 0, y: 0, z: 5 },
    rot: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI),
  },
  // Left wall
  {
    pos: { x: -5, y: 0, z: 0 },
    rot: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2),
  },
  // Ceiling
  {
    pos: { x: 0, y: 5, z: 0 },
    rot: quatFromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2),
  },
  // Floor
  {
    pos: { x: 0, y: -5, z: 0 },
    rot: quatFromAxisAngle({ x: 1, y: 0, z: 0 }, -Math.PI / 2),
  },
];

/**
 * Camera stays at the origin and turns to face each wall, ceiling or floor.
 * Up to 6 sections are placed on the 6 faces of a cube room.
 * Extra sections cycle back through the faces.
 */
export function buildRoomPath(sectionCount: number): CameraPath {
  const count = Math.max(1, sectionCount);
  const poses: Pose[] = Array.from({ length: count }, (_, i) => {
    const face = ROOM_FACES[i % ROOM_FACES.length];
    if (!face) return { position: { x: 0, y: 0, z: 0 }, quaternion: IDENTITY };
    // Camera sits at origin and rotates to look at the face
    return {
      position: { x: 0, y: 0, z: 0 },
      quaternion: lookAtOrigin(face.pos),
    };
  });
  return new CameraPath(poses);
}

/** World positions of sections for room mode — on the 6 faces of a cube */
export function roomSectionPositions(sectionCount: number): Vec3[] {
  return Array.from({ length: sectionCount }, (_, i) => {
    const face = ROOM_FACES[i % ROOM_FACES.length];
    return face?.pos ?? { x: 0, y: 0, z: -5 };
  });
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export interface PathConfig {
  mode: CameraMode;
  sectionCount: number;
  /** linear: spacing between sections in world units (default 10) */
  linearSpacing?: number;
  /** linear: camera offset in front of each section (default 6) */
  linearOffset?: number;
  /** orbital: sphere radius (default 8) */
  orbitalRadius?: number;
  /** carousel: camera ring radius (default 6) */
  carouselCameraRadius?: number;
  /** carousel: section ring radius (default 3) */
  carouselSectionRadius?: number;
}

/** Build the right CameraPath for the given mode */
export function buildCameraPathForMode(cfg: PathConfig): CameraPath {
  switch (cfg.mode) {
    case "orbital":
      return buildOrbitalPath(cfg.sectionCount, cfg.orbitalRadius);
    case "carousel":
      return buildCarouselPath(cfg.sectionCount, cfg.carouselCameraRadius);
    case "room":
      return buildRoomPath(cfg.sectionCount);
    default:
      return buildLinearPath(cfg.sectionCount, cfg.linearSpacing, cfg.linearOffset);
  }
}

/** World positions of sections for the given mode */
export function sectionPositionsForMode(cfg: PathConfig): Vec3[] {
  switch (cfg.mode) {
    case "orbital":
      return orbitalSectionPositions(cfg.sectionCount, cfg.orbitalRadius);
    case "carousel":
      return carouselSectionPositions(cfg.sectionCount, cfg.carouselSectionRadius);
    case "room":
      return roomSectionPositions(cfg.sectionCount);
    default:
      return linearSectionPositions(cfg.sectionCount, cfg.linearSpacing);
  }
}
