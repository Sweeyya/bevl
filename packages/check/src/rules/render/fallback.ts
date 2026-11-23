// Rule: render/fallback
// Pass: with WebGL turned off, the static fallback shows every section title as text
import { waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "render/fallback",
  group: "render",
  severity: "error",
  description: "Without WebGL a static fallback must show every section title.",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];
    const titles = await page.evaluate(() =>
      [...document.querySelectorAll("[data-toros-title]")].map(
        (el) => el.getAttribute("data-toros-title") ?? "",
      ),
    );

    const probe = await page.context().newPage();
    try {
      await probe.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          type: string,
          ...rest: unknown[]
        ) {
          if (/webgl/i.test(type)) return null;
          return original.call(this, type, ...(rest as []));
        } as typeof original;
      });
      const url = new URL(ctx.url);
      url.searchParams.delete("toros-test");
      await probe.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await probe
        .waitForSelector("[data-toros-fallback]", { timeout: 5000 })
        .catch(() => undefined);
      const text = await probe.evaluate(
        () => document.querySelector<HTMLElement>("[data-toros-fallback]")?.textContent ?? null,
      );
      const missing = text === null ? titles : titles.filter((t) => !text.includes(t));
      if (missing.length === 0) return [];
      return [
        {
          rule: "render/fallback",
          severity: "error",
          viewport: viewport.name,
          message:
            text === null
              ? `With WebGL off there is no static fallback on ${viewport.name}; the page is blank.`
              : `With WebGL off the fallback is missing the titles: ${missing.join(", ")} on ${viewport.name}.`,
          fix: "Fix: render the static fallback ([data-toros-fallback]) that TorosSite shows without WebGL, and keep every section title and text in it.",
          evidence: { data: { missing } },
        },
      ];
    } finally {
      await probe.close();
    }
  },
};

export default rule;
