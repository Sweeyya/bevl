// Rule: brand/sharp-corners
// Pass: no visible element has a rounded corner, unless the brand itself sets a corner radius above 0.
import { couldNotRun, NOT_READY, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

export interface CornerSample {
  tag: string;
  text: string;
  radii: string[];
}

export function hasRadius(radii: string[]): boolean {
  return radii.some((value) => value.split(/[\s/]+/).some((part) => Number.parseFloat(part) > 0));
}

const MAX_LISTED = 6;

const rule: Rule = {
  id: "brand/sharp-corners",
  group: "brand",
  severity: "warn",
  description: "Visible elements must have square corners unless the brand sets a corner radius.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    const { brandRadius, samples } = await ctx.page.evaluate(() => {
      const bridge = (
        window as unknown as { __toros?: { brand(): { radiusBase?: number } | null } }
      ).__toros;
      const out: CornerSample[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        if (el.closest("svg")) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        const radii = [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ];
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 30),
          radii,
        });
      }
      return { brandRadius: bridge?.brand()?.radiusBase ?? 0, samples: out };
    });
    if (brandRadius > 0) return [];
    const rounded = samples.filter((s) => hasRadius(s.radii));
    if (rounded.length === 0) return [];
    const listed = rounded
      .slice(0, MAX_LISTED)
      .map((s) => (s.text ? `<${s.tag}> "${s.text}"` : `<${s.tag}>`))
      .join(", ");
    return [
      {
        rule: "brand/sharp-corners",
        severity: "warn",
        viewport: ctx.viewport.name,
        message: `${rounded.length} visible element(s) have rounded corners on ${ctx.viewport.name}: ${listed}.`,
        fix: "Fix: set border-radius to 0 on those elements (and remove pill buttons, rounded cards and rounded images). Toros sites use square corners unless the brand file sets a radius.",
        evidence: { data: { count: rounded.length } },
      },
    ];
  },
};

export default rule;
