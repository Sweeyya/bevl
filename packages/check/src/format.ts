import type { Report } from "./report.js";

/** Format a check report as human-readable terminal output. */
export function formatReport(report: Report): string {
  const lines: string[] = [];

  lines.push(`Score: ${report.score}/100`);
  lines.push("");

  // Collect all rule IDs that appeared in findings (failed or warned)
  const failedRuleIds = new Set(report.findings.map((f) => f.rule));

  // Print each finding with ✗ marker
  for (const finding of report.findings) {
    if (finding.severity === "info") {
      lines.push(`  ℹ ${finding.rule}  [info]`);
    } else {
      lines.push(`✗ ${finding.rule}  [${finding.severity}]`);
    }
    // Wrap the fix message at 72 characters with 4-space indent after first line
    const fixWords = `Fix: ${finding.fix}`.split(" ");
    const fixLines: string[] = [];
    let current = "";
    for (const word of fixWords) {
      if (current.length === 0) {
        current = word;
      } else if (current.length + 1 + word.length <= 72) {
        current += ` ${word}`;
      } else {
        fixLines.push(current);
        current = word;
      }
    }
    if (current.length > 0) fixLines.push(current);

    for (let i = 0; i < fixLines.length; i++) {
      const line = fixLines[i];
      if (line === undefined) continue;
      lines.push(i === 0 ? `  ${line}` : `       ${line}`);
    }
    lines.push("");
  }

  // List rules that passed (not in findings and not info-only)
  // For now just show them from the groups
  if (failedRuleIds.size === 0) {
    lines.push("All rules passed.");
    lines.push("");
  }

  lines.push(`passed: ${report.passed}`);

  return lines.join("\n");
}
