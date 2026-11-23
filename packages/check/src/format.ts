import type { Finding, Report } from "./report.js";

const MAX_VALUE = 80;

function showValue(value: unknown): string {
  const text =
    typeof value === "number" ? String(Math.round(value * 100) / 100) : JSON.stringify(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE - 1)}…` : text;
}

function evidenceLine(finding: Finding): string | null {
  const data = finding.evidence?.data;
  if (typeof data !== "object" || data === null) return null;
  const pairs = Object.entries(data).map(([k, v]) => `${k}=${showValue(v)}`);
  return pairs.length > 0 ? pairs.join("  ") : null;
}

/** Format a check report as human-readable terminal output. */
export function formatReport(report: Report): string {
  const lines: string[] = [`Score: ${report.score}/100`, ""];

  for (const finding of report.findings) {
    const mark = finding.severity === "info" ? "  ℹ" : "✗";
    lines.push(`${mark} ${finding.rule}  [${finding.severity}]  ${finding.viewport}`);
    lines.push(`    ${finding.message}`);
    const evidence = evidenceLine(finding);
    if (evidence) lines.push(`    ${evidence}`);
    lines.push(`    ${finding.fix.startsWith("Fix:") ? finding.fix : `Fix: ${finding.fix}`}`, "");
  }

  if (report.findings.length === 0) lines.push("All rules passed.", "");
  lines.push(`passed: ${report.passed}`);
  return lines.join("\n");
}
