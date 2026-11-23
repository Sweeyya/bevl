// Rule: html/headings
// Pass: exactly one h1 on the page and heading levels never skip downward
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "html/headings",
  group: "html",
  severity: "warn",
  description: "The page needs exactly one h1 and heading levels must not skip.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(async () => {
        const bridge = (window as unknown as { __bevl?: { ready: Promise<void> } }).__bevl;
        if (!bridge) return null;
        await bridge.ready;
        const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
          Number(h.tagName[1]),
        );
        let skipped = false;
        let prev = 0;
        for (const level of levels) {
          if (level > prev + 1) skipped = true;
          prev = level;
        }
        return { h1: levels.filter((l) => l === 1).length, skipped };
      })
      .catch(() => null);
    if (result === null) return [];

    const base = { rule: "html/headings", severity: "warn" as const, viewport: ctx.viewport.name };
    const findings = [];
    if (result.h1 !== 1)
      findings.push({
        ...base,
        message: `Found ${result.h1} h1 headings on ${ctx.viewport.name}, expected exactly 1.`,
        fix: "use one <h1> in the first Section's html prop and <h2> for the other sections.",
      });
    if (result.skipped)
      findings.push({
        ...base,
        message: `Heading levels skip (for example h1 then h3) on ${ctx.viewport.name}.`,
        fix: "go down one level at a time, h1 then h2 then h3.",
      });
    return findings;
  },
};

export default rule;
