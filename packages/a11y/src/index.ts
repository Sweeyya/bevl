/**
 * @toros/a11y
 *
 * HTML layer, keyboard navigation, screen reader support, reduced motion.
 * Renders a real <nav> over the 3D canvas so the site works without a mouse.
 */

export const VERSION = "0.1.0";

export { TorosA11y } from "./components/TorosA11y.js";
export { useReducedMotion } from "./hooks/useReducedMotion.js";
export type { A11yConfig } from "./types.js";
