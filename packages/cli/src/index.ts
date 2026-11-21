/**
 * @doodley/cli
 *
 * Command line tool.
 * Commands: doodley create, add-section, apply-brand, optimize, check.
 */

export const VERSION = "0.1.0";

export { checkSite } from "./commands/check.js";
export { createSite } from "./commands/create.js";
export { optimizeAssets } from "./commands/optimize.js";
