// Rule: html/section-text
// Pass: every 3D section has a DOM section with a heading and text
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "html/section-text",
  group: "html",
  severity: "error",
  description: "Every 3D section must have a DOM element with a heading.",
  async run(ctx) {
    const findings = await ctx.page
      .evaluate(() => {
        const bridge = (window as unknown as { __doodley?: { sections(): Array<{ id: string }> } })
          .__doodley;
        if (!bridge) return [];
        const results: string[] = [];
        for (const s of bridge.sections()) {
          const el = document.getElementById(`section-${s.id}`);
          if (!el) {
            results.push(s.id);
          }
        }
        return results;
      })
      .catch(() => [] as string[]);

    return findings.map((id) => ({
      rule: "html/section-text",
      severity: "error" as const,
      viewport: ctx.viewport.name,
      message: `Section "${id}" has no DOM anchor element on ${ctx.viewport.name}.`,
      fix: `Add a <Section id="${id}" title="..."> in your DoodleySite. DoodleySite renders a hidden DOM anchor for each section in config.sections.`,
    }));
  },
};

export default rule;
