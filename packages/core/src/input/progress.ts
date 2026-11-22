import type { InputKind } from "../choreography/types.js";

export type InputSource = InputKind | "keyboard" | "nav" | "api";

export type TargetListener = (target: number, source: InputSource) => void;

const SETTLE_EPSILON = 1e-5;
const BEAT_EPSILON = 1e-4;

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

/** Holds one progress target in [0, 1] and a smoothed displayed value. */
export class ProgressController {
  target = 0;
  value = 0;
  /** When true every target change is applied to value at once (test mode). */
  instant = false;
  private beats: number[] = [];
  private listeners = new Set<TargetListener>();

  constructor(beats: number[] = []) {
    this.setBeats(beats);
  }

  setBeats(beats: number[]): void {
    this.beats = beats.map(clamp01).sort((a, b) => a - b);
  }

  getBeats(): readonly number[] {
    return this.beats.length > 0 ? this.beats : [0, 1];
  }

  listen(fn: TargetListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setTarget(p: number, source: InputSource = "api"): void {
    const next = clamp01(p);
    if (this.instant) this.value = next;
    if (next === this.target) return;
    this.target = next;
    for (const fn of this.listeners) fn(next, source);
  }

  nudge(delta: number, source: InputSource = "api"): void {
    this.setTarget(this.target + delta, source);
  }

  /** Frame-rate independent exponential smoothing. Returns true while still moving. */
  tick(dtSeconds: number, k: number): boolean {
    if (this.instant || k <= 0 || !Number.isFinite(k)) {
      this.value = this.target;
      return false;
    }
    const dt = Math.max(0, dtSeconds);
    this.value += (this.target - this.value) * (1 - Math.exp(-dt * k));
    if (Math.abs(this.target - this.value) < SETTLE_EPSILON) this.value = this.target;
    return this.value !== this.target;
  }

  snap(): void {
    this.value = this.target;
  }

  goToBeat(i: number, source: InputSource = "api"): void {
    const beats = this.getBeats();
    const index = Math.min(beats.length - 1, Math.max(0, Math.trunc(i)));
    const at = beats[index];
    if (at !== undefined) this.setTarget(at, source);
  }

  nextBeat(source: InputSource = "api"): void {
    const beats = this.getBeats();
    const at = beats.find((b) => b > this.target + BEAT_EPSILON) ?? beats[beats.length - 1];
    if (at !== undefined) this.setTarget(at, source);
  }

  prevBeat(source: InputSource = "api"): void {
    const beats = this.getBeats();
    let at = beats[0];
    for (const b of beats) if (b < this.target - BEAT_EPSILON) at = b;
    if (at !== undefined) this.setTarget(at, source);
  }

  lastBeatIndex(): number {
    return this.getBeats().length - 1;
  }
}
