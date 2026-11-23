import { ease } from "../choreography/ease.js";
import type { InputKind } from "../choreography/types.js";
import { glideDuration, type ResolvedSnap, resolveSnapIndex } from "./snap.js";

export type InputSource = InputKind | "keyboard" | "nav" | "api" | "snap";

export type TargetListener = (target: number, source: InputSource) => void;
export type ValueListener = (value: number) => void;

interface Glide {
  from: number;
  to: number;
  duration: number;
  elapsed: number;
}

const CONTINUOUS: ReadonlySet<InputSource> = new Set([
  "scroll",
  "wheel",
  "touch",
  "drag",
  "swipe-x",
]);
const GLIDED: ReadonlySet<InputSource> = new Set(["keyboard", "nav", "snap"]);
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
  private glide: Glide | null = null;
  private listeners = new Set<TargetListener>();
  private valueListeners = new Set<ValueListener>();

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

  /** Called whenever the displayed value changes. */
  listenValue(fn: ValueListener): () => void {
    this.valueListeners.add(fn);
    return () => {
      this.valueListeners.delete(fn);
    };
  }

  private setValue(v: number): void {
    if (v === this.value) return;
    this.value = v;
    for (const fn of this.valueListeners) fn(v);
  }

  setTarget(p: number, source: InputSource = "api"): void {
    const next = clamp01(p);
    if (CONTINUOUS.has(source)) this.glide = null;
    if (this.instant) {
      this.glide = null;
      this.setValue(next);
    }
    if (next === this.target) return;
    if (!this.instant && GLIDED.has(source)) this.startGlide(next);
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

  /** Continuous input during a glide continues from the displayed value, not the destination. */
  nudge(delta: number, source: InputSource = "api"): void {
    this.setTarget((this.glide ? this.value : this.target) + delta, source);
  }

  private startGlide(to: number): void {
    const duration = glideDuration(to - this.value, this.snapConfig?.duration);
    this.glide = duration > 0 ? { from: this.value, to, duration, elapsed: 0 } : null;
    if (!this.glide) this.setValue(to);
  }

  /**
   * Advances the displayed value by dt seconds. Continuous input is followed with frame-rate
   * independent exponential smoothing; snaps, nav and keyboard moves glide over a fixed duration
   * with ease-in-out. Returns true while still moving.
   */
  tick(dtSeconds: number, k: number): boolean {
    this.settleGesture(dtSeconds);
    if (this.instant || k <= 0 || !Number.isFinite(k)) {
      this.glide = null;
      this.setValue(this.target);
      return false;
    }
    const dt = Math.max(0, dtSeconds);
    const g = this.glide;
    if (g) {
      g.elapsed += dt;
      if (g.elapsed >= g.duration) {
        this.glide = null;
        this.setValue(g.to);
      } else {
        this.setValue(g.from + (g.to - g.from) * ease("easeInOut", g.elapsed / g.duration));
      }
      return this.value !== this.target;
    }
    let next = this.value + (this.target - this.value) * (1 - Math.exp(-dt * k));
    if (Math.abs(this.target - next) < SETTLE_EPSILON) next = this.target;
    this.setValue(next);
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
    if (this.snapInstantly) {
      this.glide = null;
      this.setValue(dest);
    }
  }

  snap(): void {
    this.glide = null;
    this.setValue(this.target);
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
