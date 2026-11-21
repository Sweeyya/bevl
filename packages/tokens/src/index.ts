/**
 * @doodley/tokens
 *
 * Reads design systems (DESIGN.md or design-token JSON).
 * Turns tokens into 3D materials and lights.
 */

export const VERSION = "0.1.0";

export { parseJson } from "./parse-json.js";
export { parseMd } from "./parse-md.js";
export { readTokenFile } from "./read.js";
export type { BrandTokens, TokenSourceFormat } from "./types.js";
