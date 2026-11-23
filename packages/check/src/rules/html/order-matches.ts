// Rule: html/order-matches
// Pass: the DOM order of the section landmarks matches the choreography beat order,
//       and the nav links list the sections in that same order. Sections or links
//       that are missing are other rules' business, only the order is judged.
import { couldNotRun } from "../../drive.js";
import type { Rule } from "../../rule.js";

interface Bridge {
  ready: Promise<void>;
  sections(): { id: string; anchor: number }[];
}

const rule: Rule = {
  id: "html/order-matches",
  group: "html",
  severity: "error",
  description: "DOM section order and nav link order must match the 3D beat order.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(async () => {
        const bridge = (window as unknown as { __toros?: Bridge }).__toros;
        if (!bridge) return null;
        await bridge.ready;
        const ids = bridge.sections().map((s) => s.id);
        const idOf = (value: string | null | undefined, prefix: string) =>
          value?.startsWith(prefix) ? value.slice(prefix.length) : "";
        const dom = [...document.querySelectorAll('[id^="section-"]')].map((el) =>
          idOf(el.id, "section-"),
        );
        const nav = [...document.querySelectorAll("nav a")].map((a) =>
          idOf(a.getAttribute("href"), "#section-"),
        );
        return { ids, dom, nav };
      })
      .catch(() => null);
    if (!result) return [couldNotRun(ctx, this.id, "the test bridge is not available")];

    const expected = result.ids.filter((id) => result.dom.includes(id));
    const order = (found: string[]) => found.filter((id) => expected.includes(id));
    const same = (found: string[]) =>
      order(found).join() === expected.filter((id) => found.includes(id)).join();
    const findings = [];
    if (!same(result.dom)) {
      findings.push(
        `HTML sections appear in the order ${order(result.dom).join(", ")} but the beats run ${expected.join(", ")}`,
      );
    }
    if (!same(result.nav)) {
      findings.push(
        `nav links list ${order(result.nav).join(", ")} but the beats run ${expected.join(", ")}`,
      );
    }
    return findings.map((message) => ({
      rule: "html/order-matches",
      severity: "error" as const,
      viewport: ctx.viewport.name,
      message: `On ${ctx.viewport.name}, ${message}.`,
      fix: "List <Section> components and nav links in the same order as the choreography beats, so reading order, Tab order and scroll order agree.",
    }));
  },
};

export default rule;
