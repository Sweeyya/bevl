// Rule: seo/title
// Pass: page has a non-empty <title>
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "seo/title",
  group: "seo",
  severity: "error",
  description: "Page must have a non-empty <title> element.",
  async run(ctx) {
    const title = await ctx.page.evaluate(() => document.title.trim()).catch(() => "");

    if (!title) {
      return [
        {
          rule: "seo/title",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Page has no <title> on ${ctx.viewport.name}.`,
          fix: "Add <title>Your Site Name</title> to your index.html <head>.",
        },
      ];
    }
    return [];
  },
};

export default rule;
