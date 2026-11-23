// Rule: html/section-text
// Pass: every 3D section has a DOM section with a heading and real, visible text
import type { Rule } from "../../rule.js";

type Problem = "missing" | "no-heading" | "no-text";

const rule: Rule = {
  id: "html/section-text",
  group: "html",
  severity: "error",
  description: "Every 3D section must have a DOM section with a heading and real text.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(async () => {
        const bridge = (
          window as unknown as {
            __bevl?: { ready: Promise<void>; sections(): Array<{ id: string }> };
          }
        ).__bevl;
        if (!bridge) return null;
        await bridge.ready;
        const problems: Array<{ id: string; problem: string }> = [];
        for (const s of bridge.sections()) {
          const el = document.getElementById(`section-${s.id}`);
          if (!el) {
            problems.push({ id: s.id, problem: "missing" });
            continue;
          }
          const headings = [...el.querySelectorAll("h1,h2,h3,h4,h5,h6")];
          if (headings.length === 0) problems.push({ id: s.id, problem: "no-heading" });
          const clone = el.cloneNode(true) as HTMLElement;
          for (const h of clone.querySelectorAll("h1,h2,h3,h4,h5,h6,style,script")) h.remove();
          const hidden = !el.checkVisibility({ checkVisibilityCSS: true });
          if (hidden || !(clone.textContent ?? "").trim())
            problems.push({ id: s.id, problem: "no-text" });
        }
        return problems;
      })
      .catch(() => null);

    if (result === null) {
      return [
        {
          rule: "html/section-text",
          severity: "error" as const,
          viewport: ctx.viewport.name,
          message: `Could not read sections from the test bridge on ${ctx.viewport.name}.`,
          fix: "Make sure the page renders <BevlSite> and opens in test mode (?bevl-test).",
        },
      ];
    }

    return result.map(({ id, problem }) => {
      const p = problem as Problem;
      const message =
        p === "missing"
          ? `Section "${id}" has no HTML section element on ${ctx.viewport.name}.`
          : p === "no-heading"
            ? `Section "${id}" has no heading on ${ctx.viewport.name}.`
            : `Section "${id}" has no visible text in the HTML layer on ${ctx.viewport.name}.`;
      return {
        rule: "html/section-text",
        severity: "error" as const,
        viewport: ctx.viewport.name,
        message,
        fix: `Pass real text to the section: <Section id="${id}" title="..." html={<><h2>Heading</h2><p>Text</p></>}>. Do not put the words in 3D text only.`,
      };
    });
  },
};

export default rule;
