import type { Finding, GroupResult } from "./report.js";

/** All known rule IDs, used to compute group scores from findings. */
export type RuleId = string;

/**
 * Merged group weights from TESTING.md §5.
 * "load" and "render" share the 15-point load group.
 * "html" and "seo" share the 15-point HTML group.
 * Sums to 100 (mascot weight is 5; redistributed later if no mascot rules run).
 */
const MERGED_WEIGHTS: Record<string, number> = {
  "load+render": 15,
  scroll: 20,
  nav: 10,
  "html+seo": 15,
  a11y: 15,
  budgets: 15,
  brand: 5,
  mascot: 5,
};

/** Hard-gate rule IDs: if any of these fail with error, overall score = 0. */
const HARD_GATE_RULES = new Set(["load/ready", "render/not-blank", "scroll/reaches-every-section"]);

/** Map a rule prefix to its merged group name. */
function mergedGroup(ruleId: RuleId): string {
  const prefix = ruleId.split("/")[0] ?? "";
  if (prefix === "load" || prefix === "render") return "load+render";
  if (prefix === "html" || prefix === "seo") return "html+seo";
  return prefix;
}

/** Point value of a finding per rule per viewport: error=0, warn=0.5, info=1. */
function passValue(severity: Finding["severity"]): number {
  if (severity === "error") return 0;
  if (severity === "warn") return 0.5;
  return 1; // info — does not affect score but counts as pass
}

export interface ScoreResult {
  score: number;
  passed: boolean;
  groups: Record<string, GroupResult>;
}

/**
 * Calculate the overall score, per-group scores and pass/fail.
 *
 * @param findings - Findings from all rules across all viewports.
 * @param allRuleIds - Every rule that was run (passed rules have no findings).
 */
export function calculateScore(findings: Finding[], allRuleIds: RuleId[]): ScoreResult {
  // Build a map: ruleId → array of pass values (one per viewport finding)
  const ruleResults = new Map<RuleId, number[]>();

  // Initialise every rule as passed (1.0) — findings will override
  for (const ruleId of allRuleIds) {
    ruleResults.set(ruleId, []);
  }

  // Apply findings: each finding represents a failure for that rule+viewport
  for (const finding of findings) {
    if (finding.severity === "info") continue; // info does not affect score
    const existing = ruleResults.get(finding.rule) ?? [];
    existing.push(passValue(finding.severity));
    ruleResults.set(finding.rule, existing);
  }

  // Check hard gates
  const hardGateFailed = findings.some(
    (f) => HARD_GATE_RULES.has(f.rule) && f.severity === "error",
  );

  if (hardGateFailed) {
    const groups: Record<string, GroupResult> = {};
    for (const [group, weight] of Object.entries(MERGED_WEIGHTS)) {
      groups[group] = { score: 0, weight };
    }
    return { score: 0, passed: false, groups };
  }

  // Compute per-rule score: rules with no findings = 100; rules with findings
  // = average of pass values * 100
  const ruleScores = new Map<RuleId, number>();
  for (const [ruleId, results] of ruleResults) {
    if (results.length === 0) {
      ruleScores.set(ruleId, 100);
    } else {
      const avg = results.reduce((sum, v) => sum + v, 0) / results.length;
      ruleScores.set(ruleId, avg * 100);
    }
  }

  // Compute per-merged-group score = average of its rules' scores
  const groupRuleScores = new Map<string, number[]>();
  for (const [ruleId, ruleScore] of ruleScores) {
    const group = mergedGroup(ruleId);
    const existing = groupRuleScores.get(group) ?? [];
    existing.push(ruleScore);
    groupRuleScores.set(group, existing);
  }

  const groups: Record<string, GroupResult> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [group, weight] of Object.entries(MERGED_WEIGHTS)) {
    const ruleScoreList = groupRuleScores.get(group) ?? [];
    const groupScore =
      ruleScoreList.length === 0
        ? 100
        : ruleScoreList.reduce((sum, s) => sum + s, 0) / ruleScoreList.length;
    groups[group] = { score: Math.round(groupScore), weight };
    totalWeightedScore += groupScore * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight === 0 ? 100 : totalWeightedScore / totalWeight;
  const score = Math.round(overallScore);

  const hasErrors = findings.some((f) => f.severity === "error");
  const passed = score >= 90 && !hasErrors;

  return { score, passed, groups };
}
