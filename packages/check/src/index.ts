/**
 * @doodley/check
 *
 * The checker. Runs the site in a real browser, tests every design rule and
 * performance budget, and writes a scored report (0-100).
 *
 * "Done" means: score >= 90 AND no errors.
 * See TESTING.md for every rule, their ids, severities, and fix messages.
 */

export const VERSION = "0.1.0";

/** A finding in the check report */
export interface Finding {
  rule: string;
  severity: "error" | "warn" | "info";
  viewport: "desktop" | "phone";
  section?: string;
  message: string;
  fix: string;
  evidence?: {
    screenshot?: string;
    data?: Record<string, unknown>;
  };
}

/** The full check report written to .doodley/reports/<runId>/report.json */
export interface Report {
  runId: string;
  tool: { name: string; version: string };
  project: string;
  seed: number;
  renderer: { desktop: string; phone: string };
  score: number;
  passed: boolean;
  groups: Record<string, { score: number; weight: number }>;
  findings: Finding[];
  artifacts: string[];
}

/** Exit codes for the check CLI */
export const EXIT_CODES = {
  PASSED: 0,
  ERRORS_FOUND: 1,
  BAD_USAGE: 2,
  ENV_PROBLEM: 3,
} as const;
