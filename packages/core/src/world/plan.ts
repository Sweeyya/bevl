import type { Placement } from "../choreography/layout.js";
import { cameraFrameAt, sectionPositions } from "../choreography/scene.js";
import type { Choreography, Vec3Tuple } from "../choreography/types.js";
import type { RecipeName } from "../recipes/index.js";

export type WorldKind = RecipeName;
export type Mood = "light" | "dark";

export interface WorldPlan {
  kind: WorldKind;
  positions: Vec3Tuple[];
  /** Distance from the stage centre to the section screens (inside rigs and rings). */
  radius: number;
  floorY: number;
  ceilingY: number;
  fog: [near: number, far: number];
  frame: { width: number; height: number; opacity: number };
}

const INSIDE_RADIUS_SPLIT = 7;
const HERO_HEIGHT = 0.1;

const mean = (values: number[]): number =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Where each section group stands at progress 0: its pinned track if it has one, else its layout slot. */
export function stagePositions(choreo: Choreography, ids: string[]): Vec3Tuple[] {
  const layout: Placement[] = sectionPositions(choreo, ids);
  return ids.map((id, i) => {
    const pinned = choreo.tracks?.find(
      (t) => t.target === `section-${id}` && t.prop === "position",
    );
    const key = pinned?.keys[0]?.value;
    return Array.isArray(key) ? key : (layout[i]?.position ?? [0, 0, 0]);
  });
}

/** Which recipe a choreography is shaped like, read from camera start and screen layout. */
export function inferKind(choreo: Choreography, positions: Vec3Tuple[]): WorldKind {
  const start = cameraFrameAt(choreo, 0).position;
  if (Math.hypot(...start) < 0.01) {
    const r = mean(positions.map((p) => Math.hypot(...p)));
    return r > INSIDE_RADIUS_SPLIT ? "sphere-of-screens" : "room";
  }
  const spec = choreo.layouts?.sections;
  if (spec?.arrange === "ring") return start[1] > HERO_HEIGHT ? "orbit-product" : "carousel";
  if (spec?.arrange === "line") {
    const [dx = 0, , dz = -1] = spec.direction ?? [];
    return Math.abs(dx) > Math.abs(dz) ? "horizontal-gallery" : "fly-through";
  }
  return "fly-through";
}

/** Light or dark, from the relative luminance of a `#rrggbb` background. */
export function moodOf(background: string): Mood {
  const n = Number.parseInt(background.replace("#", "").slice(0, 6), 16);
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.35 ? "light" : "dark";
}

/** Wall pillar angles (radians, yaw 0 toward -Z): two per gap between eye-level screens, flanking each screen. */
export function pillarAngles(positions: Vec3Tuple[]): number[] {
  const yaws = positions
    .filter((p) => Math.abs(p[1]) < 1)
    .map((p) => Math.atan2(p[0], -p[2]))
    .sort((a, b) => a - b);
  if (yaws.length < 2) return [];
  const wrap = (a: number): number => (a > Math.PI ? a - Math.PI * 2 : a);
  return yaws.flatMap((yaw, i) => {
    const next = i === yaws.length - 1 ? (yaws[0] ?? 0) + Math.PI * 2 : (yaws[i + 1] ?? 0);
    return [wrap(yaw + (next - yaw) * 0.3), wrap(yaw + (next - yaw) * 0.7)];
  });
}

/** Everything the set dressing needs, from the choreography. `kind` overrides inference. */
export function planWorld(choreo: Choreography, ids: string[], kind?: WorldKind): WorldPlan {
  const positions = stagePositions(choreo, ids);
  const k = kind ?? inferKind(choreo, positions);
  const ys = positions.map((p) => p[1]);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const radius = Math.max(mean(positions.map((p) => Math.hypot(...p))), 1);
  const solid = { opacity: 1 };
  switch (k) {
    case "room":
      return {
        kind: k,
        positions,
        radius,
        floorY: Math.min(-2.4, minY - 2),
        ceilingY: Math.max(4.4, maxY + 2),
        fog: [16, 50],
        frame: { width: 5.6, height: 3.2, ...solid },
      };
    case "sphere-of-screens":
      return {
        kind: k,
        positions,
        radius,
        floorY: -radius,
        ceilingY: radius,
        fog: [30, 90],
        frame: { width: 6.4, height: 3.6, ...solid },
      };
    case "fly-through":
      return {
        kind: k,
        positions,
        radius,
        floorY: -2.4,
        ceilingY: 3.4,
        fog: [12, 46],
        frame: { width: 5, height: 2.9, opacity: 0.42 },
      };
    case "horizontal-gallery":
      return {
        kind: k,
        positions,
        radius,
        floorY: -2.2,
        ceilingY: 4,
        fog: [14, 50],
        frame: { width: 5.6, height: 3.2, ...solid },
      };
    case "carousel":
      return {
        kind: k,
        positions,
        radius,
        floorY: -1.3,
        ceilingY: 4,
        fog: [10, 34],
        frame: { width: Math.min(2.8, radius * 0.9), height: 1.7, ...solid },
      };
    case "orbit-product":
      return {
        kind: k,
        positions,
        radius,
        floorY: -1.2,
        ceilingY: 4,
        fog: [10, 34],
        frame: { width: 1.8, height: 1.1, ...solid },
      };
  }
}
