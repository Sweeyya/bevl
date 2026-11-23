/**
 * @toros/check
 *
 * The checker. Runs the site in a real browser, tests every design rule and
 * performance budget, and writes a scored report (0-100).
 *
 * "Done" means: score >= 90 AND no errors.
 * See TESTING.md for every rule, their ids, severities, and fix messages.
 */

export const VERSION = "0.1.0";

export type { CheckOptions } from "./checker.js";
export { runCheck } from "./checker.js";
export { EXIT_CODES } from "./exit-codes.js";
export { formatReport } from "./format.js";

export type { Finding, GroupResult, Report, Severity } from "./report.js";

export type { Rule, RuleContext } from "./rule.js";
export type { ShotFile, ShotsManifest, ShotsOptions, ShotViewport } from "./shots.js";
export { captureShots, formatShots } from "./shots.js";
