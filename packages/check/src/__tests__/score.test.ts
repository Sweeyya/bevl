import { describe, expect, it } from "vitest";
import type { Finding } from "../report.js";
import { calculateScore } from "../score.js";

/** Minimal Finding factory for tests. */
function finding(rule: string, severity: Finding["severity"], viewport = "desktop"): Finding {
  return {
    rule,
    severity,
    viewport,
    message: `${rule} failed`,
    fix: `Fix ${rule}`,
  };
}

/** All three stub rule IDs used in the skeleton. */
const ALL_RULES = ["load/ready", "load/console-errors", "render/not-blank"];

describe("calculateScore", () => {
  it("returns score 100 when no findings and all rules pass", () => {
    const { score } = calculateScore([], ALL_RULES);
    expect(score).toBe(100);
  });

  it("sets passed=true when score is 100 and no errors", () => {
    const { passed } = calculateScore([], ALL_RULES);
    expect(passed).toBe(true);
  });

  it("an error finding in load group reduces score", () => {
    const { score } = calculateScore([finding("load/console-errors", "error")], ALL_RULES);
    expect(score).toBeLessThan(100);
  });

  it("an error finding sets passed=false", () => {
    const { passed } = calculateScore([finding("load/console-errors", "error")], ALL_RULES);
    expect(passed).toBe(false);
  });

  it("a warn finding counts as half a pass (reduces score less than error)", () => {
    const errorResult = calculateScore([finding("load/console-errors", "error")], ALL_RULES);
    const warnResult = calculateScore([finding("load/console-errors", "warn")], ALL_RULES);
    expect(warnResult.score).toBeGreaterThan(errorResult.score);
  });

  it("load/ready failing as error triggers hard gate (score = 0)", () => {
    const { score } = calculateScore([finding("load/ready", "error")], ALL_RULES);
    expect(score).toBe(0);
  });

  it("hard gate also sets passed=false", () => {
    const { passed } = calculateScore([finding("load/ready", "error")], ALL_RULES);
    expect(passed).toBe(false);
  });

  it("passed is false when score < 90 even with no errors (warn findings)", () => {
    // Build a large rule set where all rules warn, forcing the score below 90.
    // With warn = 0.5 pass value every rule scores 50, every group scores 50,
    // and the weighted average is 50 → passed must be false.
    const bigRuleSet = [
      "load/ready",
      "load/console-errors",
      "render/not-blank",
      "scroll/reaches-every-section",
      "scroll/no-jumps",
      "nav/menu-exists",
      "nav/link-glides",
      "html/section-text",
      "html/order-matches",
      "seo/title",
      "a11y/axe",
      "a11y/keyboard",
      "budgets/triangles",
      "budgets/draw-calls",
      "brand/palette",
      "mascot/visible",
    ];
    const warnFindings = bigRuleSet.map((r) => finding(r, "warn"));
    const { passed, score } = calculateScore(warnFindings, bigRuleSet);
    expect(score).toBeLessThan(90);
    expect(passed).toBe(false);
  });

  it("passed is false when there are errors even if score could be 100", () => {
    // This tests the logic: errors force passed=false regardless of score.
    const { passed } = calculateScore([finding("load/console-errors", "error")], ALL_RULES);
    expect(passed).toBe(false);
  });

  it("includes all merged groups in the result", () => {
    const { groups } = calculateScore([], ALL_RULES);
    expect(Object.keys(groups)).toContain("load+render");
  });

  it("group weights are present in the result", () => {
    const { groups } = calculateScore([], ALL_RULES);
    const loadGroup = groups["load+render"];
    expect(loadGroup).toBeDefined();
    expect(loadGroup?.weight).toBe(15);
  });

  it.each(["load/ready", "render/not-blank", "scroll/reaches-every-section"])(
    "%s failing as error is a hard gate",
    (rule) => {
      const result = calculateScore([finding(rule, "error")], [...ALL_RULES, rule]);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(Object.values(result.groups).every((g) => g.score === 0)).toBe(true);
    },
  );

  it("hard-gate rules only gate on error severity", () => {
    const { score } = calculateScore([finding("load/ready", "warn")], ALL_RULES);
    expect(score).toBeGreaterThan(0);
  });

  it("a non-gate error does not zero the score", () => {
    const { score } = calculateScore(
      [finding("scroll/no-jumps", "error")],
      [...ALL_RULES, "scroll/no-jumps"],
    );
    expect(score).toBeGreaterThan(0);
  });

  it("info findings never lower the score", () => {
    expect(calculateScore([finding("scroll/motion-allowances", "info")], ALL_RULES).score).toBe(
      100,
    );
  });
});
