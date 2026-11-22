// Rule: a11y/keyboard-reaches-beats
// Pass: ArrowDown visits every beat in order, ArrowUp returns, Home and End reach the ends
import { beatAnchors, onBeat, progress, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const SETTLE_FRAMES = 20;

const rule: Rule = {
  id: "a11y/keyboard-reaches-beats",
  group: "a11y",
  severity: "error",
  description: "Arrow keys, Home and End must reach every beat in order.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const { page } = ctx;
    const beats = [...(await beatAnchors(page))].sort((a, b) => a - b);
    const last = beats.length - 1;
    const problems: string[] = [];

    const press = async (key: string, index: number, label: string): Promise<void> => {
      await page.keyboard.press(key);
      await step(page, SETTLE_FRAMES);
      const p = await progress(page);
      if (!onBeat(beats, p) || !onBeat([beats[index] ?? 0], p))
        problems.push(`${label}: expected beat ${index}, progress is ${p.toFixed(3)}`);
    };

    await press("Home", 0, "Home");
    for (let i = 1; i <= last; i++) await press("ArrowDown", i, `ArrowDown to beat ${i}`);
    for (let i = last - 1; i >= 0; i--) await press("ArrowUp", i, `ArrowUp to beat ${i}`);
    await press("End", last, "End");
    await press("Home", 0, "Home");

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
