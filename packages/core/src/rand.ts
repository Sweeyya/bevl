/**
 * Seeded pseudo-random number generator (mulberry32).
 * Use this everywhere instead of Math.random so test mode is deterministic.
 */
export function makeRand(seed: number): () => number {
  let s = seed >>> 0;
  return function rand(): number {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}
