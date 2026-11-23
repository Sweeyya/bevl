import type { SectionConfig } from "@bevl/core";

export interface A11yConfig {
  /** Sections to render nav links for */
  sections: SectionConfig[];
  /** Label for the skip link. Default: "Skip to content" */
  skipLinkLabel?: string;
}
