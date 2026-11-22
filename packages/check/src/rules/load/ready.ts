// Rule: load/ready
// Pass: window.__doodley.ready resolves within readyMs budget
//       (default 5000ms desktop, 8000ms phone)
// Wait up to the budget for window.__doodley to exist and ready to resolve.
// Fail with a clear Fix: message if it times out.
import type { Rule } from "../../rule.js";

const READY_MS_DESKTOP = 5000;
const READY_MS_PHONE = 8000;

const rule: Rule = {
  id: "load/ready",
  group: "load",
  severity: "error",
  description: "window.__doodley.ready must resolve within the readyMs budget.",
  async run(ctx) {
    const budget = ctx.viewport.isMobile ? READY_MS_PHONE : READY_MS_DESKTOP;

    const timedOut = await ctx.page
      .evaluate((ms) => {
        const bridge = (window as unknown as { __doodley?: { ready: Promise<void> } }).__doodley;
        if (!bridge) return true;
        return Promise.race([
          bridge.ready.then(() => false),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms)),
        ]);
      }, budget)
      .catch(() => true);

    if (timedOut) {
      return [
        {
          rule: "load/ready",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `window.__doodley.ready did not resolve within ${budget}ms on ${ctx.viewport.name}.`,
          fix: `Ensure your DoodleyBridge sets up window.__doodley before the page loads and that the ready Promise resolves once all assets and fonts are loaded. Check the browser console for asset-loading errors. If the site is not on localhost, set "testMode": "always" in doodley.json so ?doodley-test is honored.`,
        },
      ];
    }

    return [];
  },
};

export default rule;
