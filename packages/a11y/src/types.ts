import type { SectionConfig } from "@doodley/core";

export interface A11yConfig {
  /** Sections to render nav links for */
  sections: SectionConfig[];
  /** Label for the skip link. Default: "Skip to content" */
  skipLinkLabel?: string;
}
