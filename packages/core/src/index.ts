/**
 * @doodley/core
 *
 * 3D runtime: sections, scroll camera path, design rules, test mode and test bridge.
 * See ARCHITECTURE.md for the full contract between core and check.
 */

export const VERSION = "0.1.0";

export type {
  Box2,
  BrandTokens,
  Budgets,
  CameraState,
  DoodleyBridge,
  DoodleyConfig,
  DoodleyEvent,
  MascotState,
  MaterialState,
  Pose,
  Quat,
  SceneStats,
  SectionConfig,
  SectionState,
  TestModeSetting,
  TextMeshState,
  Vec3,
  ViewportConfig,
} from "./contract.js";

// Design rule constants (PROJECT_PLAN.md §6)
export const DESIGN_RULES = {
  /** Camera up direction must stay within this many degrees of world up */
  MAX_ROLL_DEG: 2,
  /** Camera must turn less than this per scroll step */
  MAX_TURN_PER_STEP_DEG: 15,
  /** Camera must move less than this per scroll step (metres) */
  MAX_MOVE_PER_STEP_M: 1.5,
  /** Text meshes must not hold more than this many characters (body copy belongs in HTML) */
  MAX_TEXT_MESH_CHARS: 40,
} as const;

// Brand tokens -> scene
export type { BrandRole } from "./brand.js";
export { resolveBrand, useBrand } from "./brand.js";
// Camera path math (pure TypeScript, no browser dependency)
export { clampStep, enforceNoRoll } from "./camera/path.js";
// Scroll choreography (docs/adr/003-scroll-choreography.md)
export { registerBehavior } from "./choreography/behaviors.js";
export { defaultChoreography } from "./choreography/default.js";
export { evaluateTrack } from "./choreography/evaluate.js";
export type { Placement } from "./choreography/layout.js";
export { layoutPositions } from "./choreography/layout.js";
export type { ValidationResult } from "./choreography/schema.js";
export { validateChoreography } from "./choreography/schema.js";
export type {
  Beat,
  Behavior,
  BehaviorContext,
  CameraSpec,
  Choreography,
  EaseName,
  InputKind,
  InputSpec,
  Keyframe,
  KeyValue,
  LayoutArrange,
  LayoutSpec,
  MotionAllowances,
  Track,
  Vec3Tuple,
} from "./choreography/types.js";
export { BrandLights } from "./components/BrandLights.js";
export { BrandMaterial } from "./components/BrandMaterial.js";
// React components
export { DoodleySite } from "./components/DoodleySite.js";
export { ScrollCamera } from "./components/ScrollCamera.js";
export { Section } from "./components/Section.js";
// Context
export type { DoodleyContextValue } from "./context.js";
export { DoodleyContext } from "./context.js";
// HTML layer visibility (pure helpers)
export { activeSection, sectionVisibility } from "./html/visibility.js";
// Seeded random (use instead of Math.random in runtime code paths)
export { makeRand } from "./rand.js";
// Example choreographies for agents to start from
export type { Recipe, RecipeName } from "./recipes/index.js";
export { getRecipe, recipeNames, recipes } from "./recipes/index.js";
