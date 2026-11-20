/**
 * @doodley/core
 *
 * 3D runtime: sections, scroll camera path, design rules, test mode and test bridge.
 * See ARCHITECTURE.md for the full contract between core and check.
 */

export const VERSION = "0.1.0";

export type {
  Box2,
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
