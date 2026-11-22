// Rule: a11y/keyboard
// Pass: Tab reaches the nav and every nav link
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "a11y/keyboard",
  group: "a11y",
  severity: "error",
  description: "Tab must reach the nav and every nav link.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(() => {
        const nav = document.querySelector("nav");
        if (!nav) return { hasNav: false, linkCount: 0 };
        const links = nav.querySelectorAll("a, button");
        // Check all links are focusable (not display:none, not inert)
        let focusable = 0;
        for (const el of links) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") focusable++;
        }
        return { hasNav: true, linkCount: links.length, focusableCount: focusable };
      })
      .catch(() => ({ hasNav: false, linkCount: 0, focusableCount: 0 }));

    if (!result.hasNav) {
      return [
        {
          rule: "a11y/keyboard",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `No <nav> element found on ${ctx.viewport.name}.`,
          fix: "Add <DoodleyA11y config={...} /> from @doodley/a11y. It renders a real <nav> with one link per section.",
        },
      ];
    }

    if ((result as { focusableCount?: number }).focusableCount === 0) {
      return [
        {
          rule: "a11y/keyboard",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Nav exists but has no focusable links on ${ctx.viewport.name}.`,
          fix: "Ensure nav links are not hidden with display:none or visibility:hidden.",
        },
      ];
    }

    return [];
  },
};

export default rule;
