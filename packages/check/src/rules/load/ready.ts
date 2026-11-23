// Rule: load/ready
// Pass: window.__toros.ready resolves within readyMs budget
//       (default 5000ms desktop, 8000ms phone)
// Wait up to the budget for window.__toros to exist (apps mount asynchronously) and ready to resolve.
// Fail with a clear Fix: message if it times out.
import type { Rule } from "../../rule.js";

const READY_MS_DESKTOP = 5000;
const READY_MS_PHONE = 8000;

const rule: Rule = {
  id: "load/ready",
  group: "load",
  severity: "error",
  description: "window.__toros.ready must resolve within the readyMs budget.",
  async run(ctx) {
    const budget = ctx.viewport.isMobile ? READY_MS_PHONE : READY_MS_DESKTOP;

    const started = Date.now();
    const timedOut = await ctx.page
      .waitForFunction(() => "__toros" in window, undefined, { timeout: budget })
      .then(() =>
        ctx.page.evaluate(
          (ms) => {
            const bridge = (window as unknown as { __toros: { ready: Promise<void> } }).__toros;
            return Promise.race([
              bridge.ready.then(() => false),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms)),
            ]);
          },
          Math.max(1, budget - (Date.now() - started)),
        ),
      )
      .catch(() => true);

    if (timedOut) {
      return [
        {
          rule: "load/ready",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `window.__toros.ready did not resolve within ${budget}ms on ${ctx.viewport.name}.`,
          fix: `Ensure your TorosBridge sets up window.__toros before the page loads and that the ready Promise resolves once all assets and fonts are loaded. Check the browser console for asset-loading errors. Test mode is only honored on localhost, and never when "testMode" is "never" in toros.json. If testMode is "never" or the site is not on localhost, set "testMode": "always" so ?toros-test is honored.`,
        },
      ];
    }

    return [];
  },
};

export default rule;
