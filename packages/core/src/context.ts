/**
 * DoodleyContext — shared state between DoodleySite and its children.
 * ScrollCamera reads progress and choreography; Section reads sectionPositions.
 */

import type { ReactNode } from "react";
import { createContext } from "react";
import type { Placement } from "./choreography/layout.js";
import type { Choreography } from "./choreography/types.js";
import type { BrandTokens, SectionConfig } from "./contract.js";

export interface DoodleyContextValue {
  /** Displayed progress in [0, 1]; equals the input target in test mode */
  getProgress: () => number;
  /** Move progress to a beat by index, as nav links do; instant skips the glide (reduced motion) */
  goToBeat: (index: number, instant?: boolean) => void;
  /** Advance input smoothing by dt seconds; true while still moving */
  tick: (dtSeconds: number) => boolean;
  /** Ordered list of sections from DoodleyConfig */
  sections: SectionConfig[];
  /** Validated choreography (or the default built from sections) */
  choreography: Choreography;
  /** Placement for each section, indexed by section order */
  sectionPositions: Placement[];
  /** Brand tokens given to DoodleySite, if any */
  brand: BrandTokens | null;
  /** Section registers (or with null clears) its HTML content, which DoodleySite renders in the DOM layer */
  registerHtml: (id: string, node: ReactNode | null) => void;
}

export const DoodleyContext = createContext<DoodleyContextValue | null>(null);
