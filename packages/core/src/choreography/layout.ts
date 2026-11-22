import { catmullRomSegment } from "./evaluate.js";
import type { LayoutSpec, Vec3Tuple } from "./types.js";

export interface Placement {
  position: Vec3Tuple;
  lookAt?: Vec3Tuple;
}

const DEFAULT_RADIUS = 5;
const DEFAULT_SPACING = 2;
const SAMPLES_PER_SEGMENT = 32;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function add(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3Tuple, s: number): Vec3Tuple {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function distance(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalize(a: Vec3Tuple): Vec3Tuple {
  const len = Math.hypot(a[0], a[1], a[2]);
  return len < 1e-10 ? [0, 0, -1] : scale(a, 1 / len);
}

function offsets(spec: LayoutSpec, count: number): Vec3Tuple[] {
  const spacing = spec.spacing ?? DEFAULT_SPACING;
  const radius = spec.radius ?? DEFAULT_RADIUS;
  switch (spec.arrange) {
    case "line": {
      const dir = normalize(spec.direction ?? [0, 0, -1]);
      return Array.from({ length: count }, (_, i) => scale(dir, spacing * i));
    }
    case "grid": {
      const cols = Math.max(1, spec.columns ?? Math.ceil(Math.sqrt(count)));
      const rows = Math.ceil(count / cols);
      return Array.from({ length: count }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return [(col - (cols - 1) / 2) * spacing, ((rows - 1) / 2 - row) * spacing, 0];
      });
    }
    case "ring":
      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return [Math.sin(angle) * radius, 0, Math.cos(angle) * radius];
      });
    case "onSphere":
      return Array.from({ length: count }, (_, i) => {
        const y = 1 - (2 * (i + 0.5)) / count;
        const r = Math.sqrt(1 - y * y);
        const theta = GOLDEN_ANGLE * i;
        return [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius];
      });
    case "alongPath":
      return samplePath(spec.points ?? [], count);
  }
}

function samplePath(points: readonly Vec3Tuple[], count: number): Vec3Tuple[] {
  const first = points[0];
  if (!first) return Array.from({ length: count }, () => [0, 0, 0]);
  if (points.length === 1) return Array.from({ length: count }, () => first);

  const samples: Vec3Tuple[] = [first];
  const lengths = [0];
  for (let seg = 0; seg < points.length - 1; seg++) {
    for (let s = 1; s <= SAMPLES_PER_SEGMENT; s++) {
      const p = catmullRomSegment(points, seg, s / SAMPLES_PER_SEGMENT);
      const prev = samples[samples.length - 1] ?? p;
      lengths.push((lengths[lengths.length - 1] ?? 0) + distance(prev, p));
      samples.push(p);
    }
  }
  const total = lengths[lengths.length - 1] ?? 0;

  let j = 0;
  return Array.from({ length: count }, (_, i) => {
    const target = count === 1 ? 0 : (i / (count - 1)) * total;
    while (j < lengths.length - 2 && (lengths[j + 1] ?? total) < target) j++;
    const a = samples[j] ?? first;
    const b = samples[j + 1] ?? a;
    const la = lengths[j] ?? 0;
    const span = (lengths[j + 1] ?? la) - la;
    const t = span > 0 ? (target - la) / span : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  });
}

/** Positions for `count` children. `lookAt` is set for "inward" and "outward" facing. */
export function layoutPositions(spec: LayoutSpec, count: number): Placement[] {
  const center = spec.center ?? [0, 0, 0];
  return offsets(spec, Math.max(0, count)).map((offset) => {
    const position = add(center, offset);
    if (spec.facing === "inward") return { position, lookAt: center };
    if (spec.facing === "outward") return { position, lookAt: add(position, offset) };
    return { position };
  });
}
