/**
 * DoodleyContext — shared state between DoodleySite and its children.
 * ScrollCamera reads scrollProgress; Section reads sections and cameraPath.
 */

import { createContext } from "react";
import type { CameraPath } from "./camera/path.js";
import type { SectionConfig } from "./contract.js";

export interface DoodleyContextValue {
  /** Scroll progress from 0 (top) to 1 (bottom) */
  scrollProgress: number;
  /** Ordered list of sections from DoodleyConfig */
  sections: SectionConfig[];
  /** Camera waypoint path computed from section anchors */
  cameraPath: CameraPath;
}

export const DoodleyContext = createContext<DoodleyContextValue | null>(null);
