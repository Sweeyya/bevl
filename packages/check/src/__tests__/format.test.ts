import { describe, expect, it } from "vitest";
import { formatReport } from "../format.js";
import type { Report } from "../report.js";

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    runId: "2026-01-01T00-00-00Z-ab12",
    tool: { name: "toros", version: "0.1.0" },
    project: "test-project",
    seed: 1,
    score: 100,
    passed: true,
    groups: {
      "load+render": { score: 100, weight: 15 },
    },
    findings: [],
    artifacts: [],
    ...overrides,
  };
}

describe("formatReport", () => {
  it("formats a report with one error using ✗ and Fix:", () => {
    const report = makeReport({
      score: 73,
      passed: false,
      findings: [
        {
          rule: "render/not-blank",
          severity: "error",
          viewport: "desktop",
          message: "The page renders as a single flat color.",
          fix: "Check that your scene has geometry and at least one light.",
        },
      ],
    });
    const output = formatReport(report);
    expect(output).toContain("✗ render/not-blank");
    expect(output).toContain("Fix:");
  });

  it("includes the score in the output", () => {
    const report = makeReport({ score: 73, passed: false, findings: [] });
    const output = formatReport(report);
    expect(output).toContain("Score: 73/100");
  });

  it("formats a report with no findings showing 100/100", () => {
    const report = makeReport({ score: 100, passed: true, findings: [] });
    const output = formatReport(report);
    expect(output).toContain("Score: 100/100");
  });

  it("passed reports show passed: true", () => {
    const report = makeReport({ score: 100, passed: true, findings: [] });
    const output = formatReport(report);
    expect(output).toContain("passed: true");
  });

  it("failed reports show passed: false", () => {
    const report = makeReport({
      score: 73,
      passed: false,
      findings: [
        {
          rule: "render/not-blank",
          severity: "error",
          viewport: "desktop",
          message: "Blank screen.",
          fix: "Add geometry.",
        },
      ],
    });
    const output = formatReport(report);
    expect(output).toContain("passed: false");
  });

  it("shows [error] severity label next to the rule id", () => {
    const report = makeReport({
      score: 50,
      passed: false,
      findings: [
        {
          rule: "load/ready",
          severity: "error",
          viewport: "phone",
          message: "Timed out.",
          fix: "Resolve loading errors.",
        },
      ],
    });
    const output = formatReport(report);
    expect(output).toContain("[error]");
  });
});
