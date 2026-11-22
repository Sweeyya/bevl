import type { InputKind } from "../choreography/types.js";
import { type ResolvedSnap, resolveSnapIndex } from "./snap.js";

export type InputSource = InputKind | "keyboard" | "nav" | "api" | "snap";

export type TargetListener = (target: number, source: InputSource) => void;

const CONTINUOUS: ReadonlySet<InputSource> = new Set([
  "scroll",
  "wheel",
  "touch",
  "drag",
  "swipe-x",
]);
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
  /** Set to enable snapping to beats once input stops. */
  snapConfig: ResolvedSnap | null = null;
  /** Jump to the snapped beat instead of gliding (reduced motion). */
  snapInstantly = false;
  private beats: number[] = [];
  private snappable: boolean[] = [];
  private settled = 0;
  private gestureStart = 0;
  private pending = false;
  private idle = 0;
  private listeners = new Set<TargetListener>();

  constructor(beats: number[] = []) {
    this.setBeats(beats);
  }

  setBeats(beats: number[], snappable: boolean[] = []): void {
    const pairs = beats
      .map((b, i) => ({ at: clamp01(b), snap: snappable[i] ?? true }))
      .sort((a, b) => a.at - b.at);
    this.beats = pairs.map((p) => p.at);
    this.snappable = pairs.map((p) => p.snap);
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
    if (CONTINUOUS.has(source)) {
      if (!this.pending) this.gestureStart = this.settled;
      this.pending = true;
      this.idle = 0;
    } else {
      this.pending = false;
      this.settled = next;
    }
    this.target = next;
    for (const fn of this.listeners) fn(next, source);
  }

  nudge(delta: number, source: InputSource = "api"): void {
    this.setTarget(this.target + delta, source);
  }

  /** Frame-rate independent exponential smoothing. Returns true while still moving. */
  tick(dtSeconds: number, k: number): boolean {
    this.settleGesture(dtSeconds);
    if (this.instant || k <= 0 || !Number.isFinite(k)) {
      this.value = this.target;
      return false;
    }
    const dt = Math.max(0, dtSeconds);
    this.value += (this.target - this.value) * (1 - Math.exp(-dt * k));
    if (Math.abs(this.target - this.value) < SETTLE_EPSILON) this.value = this.target;
    return this.value !== this.target;
  }

  private settleGesture(dtSeconds: number): void {
    if (!this.pending || !this.snapConfig) return;
    this.idle += Math.max(0, dtSeconds);
    if (this.idle < this.snapConfig.delay) return;
    this.pending = false;
    const { mode, commit } = this.snapConfig;
    const index = resolveSnapIndex(
      this.beats,
      this.snappable,
      this.gestureStart,
      this.target,
      mode,
      commit,
    );
    const dest = index === null ? undefined : this.beats[index];
    if (dest === undefined) {
      this.settled = this.target;
      return;
    }
    this.setTarget(dest, "snap");
    this.settled = dest;
    if (this.snapInstantly) this.value = dest;
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
