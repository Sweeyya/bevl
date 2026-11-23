/**
 * @toros/cli
 *
 * Command line tool.
 * Commands: toros create, add-section, apply-brand, optimize, check.
 */

export const VERSION = "0.1.0";

export { addSection, applyBrand, createSite } from "@toros/tokens";
export { checkSite } from "./commands/check.js";
export { optimizeAssets } from "./commands/optimize.js";
