// Rule: load/console-errors
// Pass: no console.error or uncaught exceptions during load and interaction
// Collect console errors during the page run, report each one.
import { couldNotRun } from "../../drive.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "load/console-errors",
  group: "load",
  severity: "error",
  description: "No console.error calls or uncaught exceptions during load.",
  async run(ctx) {
    // The checker collects console errors with page.on and injects them before each rule runs.
    const errors = await ctx.page
      .evaluate(() => {
        const win = window as unknown as {
          __torosConsoleErrors?: string[];
        };
        return win.__torosConsoleErrors ?? [];
      })
      .catch(() => null);

    if (errors === null) return [couldNotRun(ctx, this.id, "the page could not be read")];

    return errors.map((msg) => ({
      rule: "load/console-errors",
      severity: "error" as const,
      viewport: ctx.viewport.name,
      message: `Console error during load: ${msg}`,
      fix: `Resolve the JavaScript error shown above. Check the browser DevTools console for a full stack trace.`,
    }));
  },
};

export default rule;
