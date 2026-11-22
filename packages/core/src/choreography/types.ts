/**
 * Scroll choreography contract. See docs/adr/003-scroll-choreography.md.
 * The scene is a pure function of progress in [0, 1].
 */

export type Vec3Tuple = [number, number, number];

export type EaseName = "linear" | "smooth" | "easeIn" | "easeOut" | "easeInOut";

export type KeyValue = number | Vec3Tuple | string;

export interface Keyframe {
  /** Progress in [0, 1] */
  at: number;
  /** number, [x, y, z], or a color string like "#ff0000" */
  value: KeyValue;
  /** Easing for the segment that ends at this key. Default "smooth". */
  ease?: EaseName;
}

export interface Track {
  /** "camera" or the name of an object (R3F `name` prop or a layout id) */
  target: string;
  /**
   * Dot path to the property, e.g. "position", "rotation.y", "material.opacity",
   * "material.color". Camera props: "position", "lookAt", "fov".
   */
  prop: string;
  keys: Keyframe[];
  /** For Vec3 tracks: "linear" segments or a Catmull-Rom "curve" through the keys. Default "linear". */
  path?: "linear" | "curve";
}

export interface Beat {
  /** Must match a SectionConfig id */
  id: string;
  /** Progress in [0, 1] where this section is in focus */
  at: number;
  /** Set false to let progress rest anywhere near this beat instead of locking onto it. Default true. */
  snap?: boolean;
}

export type LayoutArrange = "line" | "grid" | "ring" | "onSphere" | "alongPath";

export interface LayoutSpec {
  arrange: LayoutArrange;
  /** ring / onSphere radius */
  radius?: number;
  /** line / grid spacing */
  spacing?: number;
  /** grid column count */
  columns?: number;
  /** line direction, default [0, 0, -1] */
  direction?: Vec3Tuple;
  /** alongPath control points */
  points?: Vec3Tuple[];
  /** Which way children face, default "camera" */
  facing?: "inward" | "outward" | "camera";
  /** Center of the layout, default [0, 0, 0] */
  center?: Vec3Tuple;
}

export interface CameraSpec {
  position: Vec3Tuple;
  lookAt?: Vec3Tuple;
  fov?: number;
}

/** Inputs that move progress. Keyboard and nav links are always on and not listed. */
export type InputKind = "scroll" | "wheel" | "touch" | "drag" | "swipe-x" | "tap-advance";

export interface InputSpec {
  /** Inputs for mouse / trackpad users, matched by (pointer: fine). Default ["scroll"]. */
  fine?: InputKind[];
  /** Inputs for touch users, matched by (pointer: coarse). Default ["scroll"]. */
  coarse?: InputKind[];
  wheelMultiplier?: number;
  touchMultiplier?: number;
  /** Smoothing rate k in 1 - e^(-dt*k). 0 disables smoothing. Default 6. Ignored in test mode. */
  smoothing?: number;
}

export type SnapMode = "directional" | "nearest" | "strong" | "none";

export interface SnapSettings {
  /**
   * directional: after the user stops, glide to the beat in the direction they were moving (default).
   * nearest: glide to the closest beat.
   * strong: like directional, but a single gesture never moves more than one beat.
   * none: never snap.
   */
  mode?: SnapMode;
  /** Seconds without input before snapping starts. Default 0.12. Always 0 in test mode. */
  delay?: number;
  /** Fraction (0-1) of the gap to the next beat the user must cross to advance; less snaps back. Default 0.15. */
  commit?: number;
}

/** Snapping is on by default. `coarse` overrides the settings for touch users. */
export interface SnapSpec extends SnapSettings {
  coarse?: SnapSettings;
}

/** Explicit opt-outs from the gentle-motion rules. The checker reports each one. */
export interface MotionAllowances {
  roll?: boolean;
  spin?: boolean;
  fastMoves?: boolean;
}

export interface Choreography {
  version: 1;
  beats: Beat[];
  camera: CameraSpec;
  layouts?: Record<string, LayoutSpec>;
  tracks?: Track[];
  /** Names of behaviors registered with registerBehavior() */
  behaviors?: string[];
  input?: InputSpec;
  snap?: SnapSpec;
  allow?: MotionAllowances;
}

/** Context passed to behaviors each frame */
export interface BehaviorContext {
  /** Find a scene object by name */
  getObject: (name: string) => unknown;
  camera: unknown;
  /** Seeded random, never Math.random */
  rand: () => number;
}

/** A behavior must be a pure function of progress: no clocks, no Math.random, no timers. */
export type Behavior = (progress: number, ctx: BehaviorContext) => void;
