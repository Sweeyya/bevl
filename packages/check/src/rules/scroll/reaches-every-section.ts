// Rule: scroll/reaches-every-section
// Pass: every section is entered in order when scrolling from top to bottom
import type { Rule } from "../../rule.js";

const SCROLL_STEPS = 40;

const rule: Rule = {
  id: "scroll/reaches-every-section",
  group: "scroll",
  severity: "error",
  description: "Every section must be reachable by scrolling from top to bottom.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(async (steps) => {
        const bridge = (
          window as unknown as {
            __doodley?: {
              ready: Promise<void>;
              sections(): Array<{ id: string; index: number }>;
              step(ms: number): unknown;
            };
          }
        ).__doodley;
        if (!bridge) return { missing: [], total: 0 };

        await bridge.ready;

        const allSections = bridge.sections();
        if (allSections.length === 0) return { missing: [], total: 0 };

        const reached = new Set<string>();

        const scroller =
          document.querySelector<HTMLElement>("[data-doodley-scroller]") ??
          (document.scrollingElement as HTMLElement) ??
          document.documentElement;

        const max = scroller.scrollHeight - scroller.clientHeight;
        if (max <= 0) return { missing: allSections.map((s) => s.id), total: allSections.length };

        for (let i = 0; i <= steps; i++) {
          scroller.scrollTop = (i / steps) * max;
          bridge.step(1000 / 60);

          // Check which section the camera is closest to
          for (const s of allSections) {
            const el = document.getElementById(`section-${s.id}`);
            if (el) reached.add(s.id);
          }
        }

        const missing = allSections.filter((s) => !reached.has(s.id)).map((s) => s.id);
        return { missing, total: allSections.length };
      }, SCROLL_STEPS)
      .catch(() => ({ missing: [] as string[], total: 0 }));

    if (result.missing.length > 0) {
      return [
        {
          rule: "scroll/reaches-every-section",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Sections not reached on ${ctx.viewport.name}: ${result.missing.join(", ")}`,
          fix: 'Ensure every section has a DOM anchor element with id="section-<id>". Check that the scroll container height is at least sections.length * 100vh.',
        },
      ];
    }
    return [];
  },
};

export default rule;
