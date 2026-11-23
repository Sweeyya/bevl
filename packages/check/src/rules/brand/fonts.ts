// Rule: brand/fonts
// Pass: visible nav links, headings and paragraphs start their font-family with a brand font.
// Skipped when the site passes no brand tokens.
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "brand/fonts",
  group: "brand",
  severity: "warn",
  description: "Visible text must use the brand fonts.",
  async run(ctx) {
    const wrong = await ctx.page
      .evaluate(() => {
        const brand = (
          window as unknown as {
            __bevl?: { brand(): { fonts: { heading: string; body: string } } | null };
          }
        ).__bevl?.brand();
        if (!brand) return null;
        const first = (value: string): string =>
          (value.split(",")[0] ?? "")
            .trim()
            .replace(/^["']|["']$/g, "")
            .toLowerCase();
        const allowed = new Set([first(brand.fonts.heading), first(brand.fonts.body)]);
        const bad = new Set<string>();
        for (const el of document.querySelectorAll("nav a, h1, h2, h3, p")) {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const visible =
            rect.width > 1 &&
            rect.height > 1 &&
            style.visibility !== "hidden" &&
            style.display !== "none";
          if (!visible || !el.textContent?.trim()) continue;
          const family = first(style.fontFamily);
          if (!allowed.has(family))
            bad.add(`${el.tagName.toLowerCase()} in ${family || "default"}`);
        }
        return [...bad];
      })
      .catch(() => null);
    if (!wrong || wrong.length === 0) return [];
    return [
      {
        rule: "brand/fonts",
        severity: "warn",
        viewport: ctx.viewport.name,
        message: `Text is not using the brand fonts: ${wrong.join(", ")}.`,
        fix: "Remove font-family overrides on text so it inherits the brand font that BevlSite sets, or use var(--bevl-font-heading) and var(--bevl-font-body).",
      },
    ];
  },
};

export default rule;
