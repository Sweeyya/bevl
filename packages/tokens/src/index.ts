/**
 * @doodley/tokens
 *
 * Reads design systems (DESIGN.md or design-token JSON).
 * Turns tokens into 3D materials and lights.
 */

export const VERSION = "0.1.0";

/** Supported token source formats */
export type TokenSourceFormat = "design-md" | "design-tokens-json" | "style-dictionary";
