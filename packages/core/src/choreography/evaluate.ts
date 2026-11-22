import { ease } from "./ease.js";
import type { KeyValue, Track, Vec3Tuple } from "./types.js";

const HEX = /^#[0-9a-fA-F]{6}$/;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (3 * p1 - p0 - 3 * p2 + p3) * t2 * t)
  );
}

/** Uniform Catmull-Rom between points[i] and points[i + 1]; ends are extrapolated. */
export function catmullRomSegment(points: readonly Vec3Tuple[], i: number, t: number): Vec3Tuple {
  const p1 = points[i];
  const p2 = points[i + 1] ?? p1;
  if (!p1 || !p2) throw new Error(`catmullRomSegment: no point at index ${i}`);
  const p0 = points[i - 1] ?? lerpVec(p2, p1, 2);
  const p3 = points[i + 2] ?? lerpVec(p1, p2, 2);
  return [
    catmull(p0[0], p1[0], p2[0], p3[0], t),
    catmull(p0[1], p1[1], p2[1], p3[1], t),
    catmull(p0[2], p1[2], p2[2], p3[2], t),
  ];
}

function parseHex(hex: string): Vec3Tuple {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Vec3Tuple): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function blend(a: KeyValue, b: KeyValue, t: number): KeyValue {
  if (typeof a === "number" && typeof b === "number") return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return lerpVec(a, b, t);
  if (typeof a === "string" && typeof b === "string" && HEX.test(a) && HEX.test(b)) {
    return toHex(lerpVec(parseHex(a), parseHex(b), t));
  }
  return t < 1 ? a : b;
}

/** Value of a track at progress. Keys must be sorted by `at`. Clamps outside the first and last key. */
export function evaluateTrack(track: Track, progress: number): KeyValue {
  const keys = track.keys;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) throw new Error(`Track ${track.target}.${track.prop} has no keys`);
  if (progress <= first.at) return first.value;
  if (progress >= last.at) return last.value;

  let i = 0;
  while (i < keys.length - 2 && (keys[i + 1]?.at ?? 1) <= progress) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!a || !b) return last.value;
  const span = b.at - a.at;
  const t = ease(b.ease, span > 0 ? (progress - a.at) / span : 1);

  if (track.path === "curve" && Array.isArray(a.value) && Array.isArray(b.value)) {
    const points = keys.map((k) => k.value).filter((v): v is Vec3Tuple => Array.isArray(v));
    if (points.length === keys.length) return catmullRomSegment(points, i, t);
  }
  return blend(a.value, b.value, t);
}
