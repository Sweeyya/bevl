import type { Brief } from "./brief.js";
import { type ArtDirection, directions } from "./directions.js";

export interface DealOptions {
  seed: number;
  history?: readonly string[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function score(brief: Brief, direction: ArtDirection): number {
  const kind = direction.kinds.includes(brief.kind) ? 10 : 0;
  const words = new Set(direction.mood);
  const tone = brief.tone.filter((w) => words.has(w.trim().toLowerCase())).length;
  return kind + tone * 3;
}

export function dealDirection(brief: Brief, opts: DealOptions): ArtDirection {
  const used = new Set(opts.history ?? brief.history ?? []);
  const fresh = directions.filter((d) => !used.has(d.id));
  const pool = fresh.length > 0 ? fresh : directions;
  const scored = pool.map((d) => ({ d, s: score(brief, d) }));
  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s === best);
  const pick = top[Math.floor(mulberry32(opts.seed)() * top.length)];
  if (!pick) throw new Error("The taste library is empty. Fix: reinstall @toros/tokens.");
  return pick.d;
}
