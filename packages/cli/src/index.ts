/**
 * @bevl/cli
 *
 * Command line tool.
 * Commands: bevl create, add-section, apply-brand, optimize, check.
 */

export const VERSION = "0.1.0";

export { addSection, applyBrand, createSite } from "@bevl/tokens";
export { checkSite } from "./commands/check.js";
export { optimizeAssets } from "./commands/optimize.js";
