/**
 * @doodley/optimizer
 *
 * Shrinks models and textures. Enforces the performance budget.
 */

export const VERSION = "0.1.0";

export type { OptimizeOptions, OptimizeResult } from "./optimize.js";
export { optimizeGlb } from "./optimize.js";
