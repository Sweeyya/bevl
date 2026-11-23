// Rule: a11y/keyboard-reaches-beats
// Pass: ArrowDown visits every beat in order, ArrowUp returns, Home and End reach the ends
import {
  beatAnchors,
  couldNotRun,
  NOT_READY,
  waitReady,
  walkBeatsByKeyboard,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "a11y/keyboard-reaches-beats",
  group: "a11y",
  severity: "error",
  description: "Arrow keys, Home and End must reach every beat in order.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const { page } = ctx;
    const beats = [...(await beatAnchors(page))].sort((a, b) => a - b);
    if (beats.length === 0) return [couldNotRun(ctx, this.id, "the bridge reports no sections")];
    const problems = await walkBeatsByKeyboard(page, beats);

    if (problems.length === 0) return [];
    return [
      {
        rule: "a11y/keyboard-reaches-beats",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `Keyboard does not reach every beat on ${ctx.viewport.name}: ${problems.join("; ")}.`,
        fix: "Fix: do not stop keydown events for ArrowDown, ArrowUp, Home, End, PageDown, PageUp or Space on window, and keep beats at least 0.001 apart.",
        evidence: { data: { problems } },
      },
    ];
  },
};

export default rule;
