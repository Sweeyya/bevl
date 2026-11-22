/**
 * Doodley shared contracts.
 *
 * Contract A: DoodleyConfig — the doodley.json every project has.
 * Contract B: DoodleyBridge — window.__doodley exposed in test mode.
 *
 * If either contract changes, update ARCHITECTURE.md first.
 */

import type { Choreography } from "./choreography/types.js";

// ─── Contract A: doodley.json ────────────────────────────────────────────────

/** Where `?doodley-test` is honored: "localhost" (default), "always" (e.g. checking a preview URL), or "never". */
export type TestModeSetting = "localhost" | "always" | "never";

export interface DoodleyConfig {
  /** Project name, used in reports */
  name: string;
  /** Path to the brand/token file (DESIGN.md or design-token JSON) */
  brand?: string;
  /** Ordered list of sections */
  sections: SectionConfig[];
  /**
   * Scroll choreography: beats, camera, tracks, layouts and behaviors.
   * Default: camera flies forward along -Z, one beat per section.
   * See docs/adr/003-scroll-choreography.md.
   */
  choreography?: Choreography;
  /** Where the test bridge may be switched on with ?doodley-test. Default "localhost". */
  testMode?: TestModeSetting;
  /** Performance budgets. Defaults come from doodley.budgets.json */
  budgets?: Partial<Budgets>;
  /** Viewports to test. Defaults: desktop + phone */
  viewports?: ViewportConfig[];
}

export interface SectionConfig {
  id: string;
  title: string;
  /** Scroll anchor (0-1). Computed automatically if omitted. */
  anchor?: number;
}

export interface Budgets {
  trianglesDesktop: number;
  trianglesPhone: number;
  drawCallsDesktop: number;
  drawCallsPhone: number;
  textureMbDesktop: number;
  textureMbPhone: number;
  modelMb: number;
  jsKb: number;
  readyMsDesktop: number;
  readyMsPhone: number;
  maxStepMeters: number;
  maxTurnPerStepDeg: number;
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

// ─── Contract B: window.__doodley ────────────────────────────────────────────

export interface DoodleyBridge {
  /** Resolves when scene, assets and fonts are loaded */
  ready: Promise<void>;
  /** Advance time by ms. Returns the new time and frame number. */
  step(ms: number): { time: number; frame: number };
  /** Every beat in order with its anchor and the camera pose at that beat */
  sections(): SectionState[];
  /** Current camera state */
  camera(): CameraState;
  /** The validated choreography in effect: beats, snap settings and motion allowances (read-only) */
  choreography(): Choreography;
  /** Current scroll progress 0-1 */
  scroll(): number;
  /** Scene stats (triangles, draw calls, texture MB, etc.) */
  stats(): SceneStats;
  /** Every material and its colors */
  materials(): MaterialState[];
  /** Any 3D text meshes (should have <= 40 chars each) */
  textMeshes(): TextMeshState[];
  /** Mascot state if present */
  mascot(): MascotState | null;
  /** Ordered event log */
  events(): DoodleyEvent[];
}

export interface SectionState {
  id: string;
  /** Position in the beats list */
  index: number;
  /** The beat `at` (0-1) for this section */
  anchor: number;
  cameraPose: Pose;
  domId: string;
}

export interface CameraState {
  position: Vec3;
  quaternion: Quat;
  up: Vec3;
  fov: number;
  sectionId: string | null;
}

export interface SceneStats {
  triangles: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  textureMbEstimate: number;
}

export interface Pose {
  position: Vec3;
  quaternion: Quat;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}
export type MaterialState = { name: string; colors: string[] };
export type TextMeshState = { text: string; charCount: number };
export type MascotState = { visible: boolean; screenBox: Box2; state: string };
export type Box2 = { x: number; y: number; width: number; height: number };
export type DoodleyEvent =
  | { type: "section-entered"; sectionId: string; time: number }
  | { type: "nav-clicked"; target: string; time: number }
  | { type: "glide-start"; from: string; to: string; time: number }
  | { type: "glide-end"; sectionId: string; time: number }
  | { type: "error"; message: string; time: number };
