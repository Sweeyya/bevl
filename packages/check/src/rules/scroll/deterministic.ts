// Rule: scroll/deterministic
// Pass: two fresh loads with the same seed give the same camera at the same scroll positions
import { cameraPose, couldNotRun, scrollTo, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const POSITIONS = [0.1, 0.35, 0.5, 0.8, 1];
const TOLERANCE = 1e-6;

type Sample = number[];

const rule: Rule = {
  id: "scroll/deterministic",
  group: "scroll",
  severity: "error",
  description: "The same seed must produce the same camera at the same scroll positions.",
  async run(ctx) {
    const browser = ctx.page.context().browser();
    if (!browser)
      return [couldNotRun(ctx, this.id, "the page has no browser to open a second context in")];
    const run = async (): Promise<Sample | null> => {
      const context = await browser.newContext({
        viewport: { width: ctx.viewport.width, height: ctx.viewport.height },
        isMobile: ctx.viewport.isMobile,
        hasTouch: ctx.viewport.isMobile,
      });
      try {
        const page = await context.newPage();
        await page.goto(ctx.url, { waitUntil: "domcontentloaded" });
        if (!(await waitReady(page))) return null;
        const out: Sample = [];
        for (const p of POSITIONS) {
          if (!(await scrollTo(page, p))) return null;
          await step(page, 5);
          const cam = await cameraPose(page);
          if (!cam) return null;
          const { position: v, quaternion: q } = cam;
          out.push(v.x, v.y, v.z, q.x, q.y, q.z, q.w);
        }
        return out;
      } catch {
        return null;
      } finally {
        await context.close();
      }
    };

    const a = await run();
    const b = await run();
    if (!a || !b) {
      return [
        couldNotRun(
          ctx,
          this.id,
          "the page could not be loaded and scrolled twice in fresh browser contexts",
        ),
      ];
    }
    const worst = a.reduce((m, v, i) => Math.max(m, Math.abs(v - (b[i] ?? Number.NaN))), 0);
    if (worst <= TOLERANCE) return [];
    return [
      {
        rule: "scroll/deterministic",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `Two loads with the same seed differ by ${worst.toExponential(2)} in camera pose on ${ctx.viewport.name} (max ${TOLERANCE}).`,
        fix: "Fix: use the seeded rand() passed to behaviors instead of Math.random, and do not read clocks (Date.now, performance.now) in behaviors or scene code.",
        evidence: { data: { worst, tolerance: TOLERANCE } },
      },
    ];
  },
};

export default rule;
