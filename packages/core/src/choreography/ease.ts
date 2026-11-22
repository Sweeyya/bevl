import type { EaseName } from "./types.js";

export const EASES: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - (1 - t) ** 3,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

export function ease(name: EaseName | undefined, t: number): number {
  return EASES[name ?? "smooth"](Math.min(1, Math.max(0, t)));
}
