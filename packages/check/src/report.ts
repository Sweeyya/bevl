export type Severity = "error" | "warn" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  viewport: string;
  section?: string;
  message: string;
  fix: string;
  evidence?: Record<string, unknown>;
}

export interface GroupResult {
  score: number; // 0-100 for this group
  weight: number; // from TESTING.md §5
}

export interface Report {
  runId: string;
  tool: { name: string; version: string };
  project: string;
  seed: number;
  renderer?: { desktop?: string; phone?: string };
  score: number; // 0-100 overall
  passed: boolean; // score >= 90 AND no errors
  groups: Record<string, GroupResult>;
  findings: Finding[];
  /** How long each rule took, per viewport, in milliseconds */
  timings?: RuleTiming[];
  artifacts: string[];
}

export interface RuleTiming {
  rule: string;
  viewport: string;
  ms: number;
}
