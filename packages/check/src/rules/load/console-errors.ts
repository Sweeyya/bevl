// Rule: load/console-errors
// Pass: no console.error or uncaught exceptions during load and interaction
// Collect console errors during the page run, report each one.
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "load/console-errors",
  group: "load",
  severity: "error",
  description: "No console.error calls or uncaught exceptions during load.",
  async run(ctx) {
    // Console errors are collected by the checker via page.on("console") before
    // rules run. They are passed through ctx as a convention: any console
    // errors recorded before this rule runs are stored on the page object under
    // a custom property injected by the checker. If no errors are present this
    // is a no-op stub that always passes.
    //
    // In the full implementation the checker will inject collected errors via
    // a shared store; for the skeleton we return an empty array (pass).
    const errors = await ctx.page
      .evaluate(() => {
        const win = window as unknown as {
          __doodleyConsoleErrors?: string[];
        };
        return win.__doodleyConsoleErrors ?? [];
      })
      .catch(() => [] as string[]);

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
