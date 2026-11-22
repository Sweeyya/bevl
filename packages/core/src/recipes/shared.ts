import { Euler, Matrix4, Vector3 } from "three";
import { beatAt } from "../choreography/default.js";
import type { Beat, Choreography, Track, Vec3Tuple } from "../choreography/types.js";

export interface Recipe {
  name: string;
  description: string;
  whenToUse: string;
  feel: string;
  create: (sectionIds: string[]) => Choreography;
}

const SUBDIVISIONS = 8;
export const FOV = 60;

const round = (x: number): number => Math.round(x * 1e4) / 1e4 + 0;

export const vec = (x: number, y: number, z: number): Vec3Tuple => [round(x), round(y), round(z)];

export const rad = (deg: number): number => (deg * Math.PI) / 180;

export const beatsFor = (ids: string[]): Beat[] =>
  ids.map((id, i) => ({ id, at: beatAt(i, ids.length) }));

/** Linear keys over beats, with `sub` extra keys per segment. `f` takes a continuous section index. */
export function trackFor(
  prop: string,
  count: number,
  f: (index: number) => Vec3Tuple,
  options: { sub?: number; path?: Track["path"]; target?: string } = {},
): Track[] {
  if (count < 1) return [];
  const sub = options.sub ?? SUBDIVISIONS;
  const last = (count - 1) * sub;
  const keys = Array.from({ length: last + 1 }, (_, j) => ({
    at: last === 0 ? 0 : round(j / last),
    value: f(j / sub),
    ease: "linear" as const,
  }));
  return [
    {
      target: options.target ?? "camera",
      prop,
      keys,
      ...(options.path ? { path: options.path } : {}),
    },
  ];
}

/** Linear interpolation through `values` at a continuous index. */
export function lerpAt(values: number[], index: number): number {
  const i = Math.min(Math.max(Math.floor(index), 0), Math.max(values.length - 2, 0));
  const a = values[i] ?? 0;
  const b = values[i + 1] ?? a;
  return a + (b - a) * Math.min(Math.max(index - i, 0), 1);
}

/** Euler angles that make an object's +Z axis point from `position` toward `toward`. */
export function facing(position: Vec3Tuple, toward: Vec3Tuple): Vec3Tuple {
  const m = new Matrix4().lookAt(
    new Vector3(...toward),
    new Vector3(...position),
    new Vector3(0, 1, 0),
  );
  const e = new Euler().setFromRotationMatrix(m, "XYZ");
  return vec(e.x, e.y, e.z);
}

/** Pin each section group to a fixed pose with one-key tracks. */
export function pinSections(ids: string[], positions: Vec3Tuple[]): Track[] {
  return ids.flatMap((id, i) => {
    const position = positions[i] ?? [0, 0, 0];
    const target = `section-${id}`;
    return [
      { target, prop: "position", keys: [{ at: 0, value: position }] },
      { target, prop: "rotation", keys: [{ at: 0, value: facing(position, [0, 0, 0]) }] },
    ];
  });
}

/** Direction on a sphere. yaw 0 looks down -Z, positive yaw turns right. */
export function direction(yaw: number, pitch: number, radius: number): Vec3Tuple {
  return vec(
    Math.sin(yaw) * Math.cos(pitch) * radius,
    Math.sin(pitch) * radius,
    -Math.cos(yaw) * Math.cos(pitch) * radius,
  );
}

/** Camera at the origin turning through `views` (yaw, pitch in degrees) with screens at `radius`. */
export function insideRig(
  ids: string[],
  views: Array<[number, number]>,
  radius: number,
): Pick<Choreography, "beats" | "camera" | "tracks"> {
  const yaws = views.map(([yaw]) => rad(yaw));
  const pitches = views.map(([, pitch]) => rad(pitch));
  const look = (index: number): Vec3Tuple =>
    direction(lerpAt(yaws, index), lerpAt(pitches, index), radius);
  return {
    beats: beatsFor(ids),
    camera: { position: [0, 0, 0], lookAt: look(0), fov: FOV },
    tracks: [
      ...pinSections(
        ids,
        views.map(([yaw, pitch], i) => direction(yaws[i] ?? rad(yaw), rad(pitch), radius)),
      ),
      ...trackFor("lookAt", ids.length, look),
    ],
  };
}
