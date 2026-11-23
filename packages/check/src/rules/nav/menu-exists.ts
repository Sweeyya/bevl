// Rule: nav/menu-exists
// Pass: a real <nav> has a visible link for every section
import { waitReady } from "../../drive.js";
import { listNavControls } from "../../nav.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "nav/menu-exists",
  group: "nav",
  severity: "error",
  description: "A real <nav> must have one visible link per section.",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];
    const controls = await listNavControls(page);
    const sections = await page.evaluate(
      () =>
        (
          window as unknown as { __toros?: { sections(): Array<{ id: string }> } }
        ).__toros?.sections() ?? [],
    );
    const linked = new Set(controls.filter((c) => c.visible).map((c) => c.sectionId));
    const missing = sections.map((s) => s.id).filter((id) => !linked.has(id));
    if (missing.length === 0) return [];
    return [
      {
        rule: "nav/menu-exists",
        severity: "error",
        viewport: viewport.name,
        message:
          controls.length === 0
            ? `No <nav> with links found on ${viewport.name}.`
            : `The <nav> has no visible link for: ${missing.join(", ")} on ${viewport.name}.`,
        fix: 'Fix: add <TorosA11y config={{ sections }} /> as the TorosSite overlay, or a <nav> with one link per section (href="#section-<id>").',
        evidence: { data: { missing } },
      },
    ];
  },
};

export default rule;
