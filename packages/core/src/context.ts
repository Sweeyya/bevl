/**
 * DoodleyContext — shared state between DoodleySite and its children.
 * ScrollCamera reads scrollProgress; Section reads sections and cameraPath.
 */

import { createContext } from "react";
import type { CameraPath } from "./camera/path.js";
import type { CameraMode, SectionConfig, Vec3 } from "./contract.js";

export interface DoodleyContextValue {
  /** Scroll progress from 0 (top) to 1 (bottom) */
  scrollProgress: number;
  /** Ordered list of sections from DoodleyConfig */
  sections: SectionConfig[];
  /** Camera waypoint path computed from section anchors */
  cameraPath: CameraPath;
  /** World-space distance between sections along Z (linear mode only) */
  sectionSpacing: number;
  /** Active camera mode */
  cameraMode: CameraMode;
  /** World positions for each section, indexed by section order */
  sectionPositions: Vec3[];
}

export const DoodleyContext = createContext<DoodleyContextValue | null>(null);
