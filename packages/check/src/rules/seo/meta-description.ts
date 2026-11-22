// Rule: seo/meta-description
// Pass: page has a meta description
import type { Rule } from "../../rule.js";

const HEAD_WAIT_MS = 2000;

const rule: Rule = {
  id: "seo/meta-description",
  group: "seo",
  severity: "warn",
  description: "Page should have a meta description.",
  async run(ctx) {
    await ctx.page
      .waitForFunction(
        () => document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content?.trim(),
        undefined,
        { timeout: HEAD_WAIT_MS },
      )
      .catch(() => undefined);
    const desc = await ctx.page
      .evaluate(() => {
        const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        return el?.content?.trim() ?? "";
      })
      .catch(() => "");

    if (!desc) {
      return [
        {
          rule: "seo/meta-description",
          severity: "warn",
          viewport: ctx.viewport.name,
          message: `Page has no meta description on ${ctx.viewport.name}.`,
          fix: 'Add <meta name="description" content="A short description of your site."> to your index.html <head>.',
        },
      ];
    }
    return [];
  },
};

export default rule;
