import type { SnapMode, SnapSettings, SnapSpec } from "../choreography/types.js";

export const DEFAULT_SNAP = { mode: "directional", delay: 0.12, commit: 0.15 } as const;

export interface ResolvedSnap {
  mode: SnapMode;
  delay: number;
  commit: number;
}

export function resolveSnapSettings(spec: SnapSpec | undefined, coarse: boolean): ResolvedSnap {
  const over: SnapSettings = coarse ? (spec?.coarse ?? {}) : {};
  const mode = over.mode ?? spec?.mode ?? DEFAULT_SNAP.mode;
  const commit = over.commit ?? spec?.commit ?? DEFAULT_SNAP.commit;
  const delay = over.delay ?? spec?.delay ?? DEFAULT_SNAP.delay;
  return { mode, delay, commit };
}

export function nearestIndex(beats: readonly number[], x: number): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  beats.forEach((b, i) => {
    const d = Math.abs(b - x);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/**
 * Which beat index to settle on once input stops, or null to stay put.
 * `anchor` is where the gesture started and `target` where it ended.
 * Beats with `snappable[i] === false` are never locked onto.
 */
export function resolveSnapIndex(
  beats: readonly number[],
  snappable: readonly boolean[],
  anchor: number,
  target: number,
  mode: SnapMode,
  commit: number,
): number | null {
  if (mode === "none" || beats.length === 0) return null;
  let index: number;
  if (mode === "nearest") {
    index = nearestIndex(beats, target);
  } else {
    const a = nearestIndex(beats, anchor);
    const at = beats[a] ?? 0;
    const dir = Math.sign(target - at);
    const neighbor = a + dir;
    const next = beats[neighbor];
    if (dir === 0 || next === undefined) {
      index = a;
    } else {
      const gap = Math.abs(next - at);
      const moved = Math.abs(target - at);
      if (moved < commit * gap) {
        index = a;
      } else {
        let reach = neighbor;
        if (mode === "directional") {
          while (beats[reach + dir] !== undefined && (beats[reach] ?? 0) * dir < target * dir) {
            reach += dir;
          }
        }
        index = reach;
      }
    }
  }
  return snappable[index] === false ? null : index;
}
