// Rule: render/not-blank
// Pass: the 3D canvas, alone, is not one flat color (not all black, not all white,
//       not all magenta). At least 1% of its pixels must differ from the most common
//       color. Nav, the HTML layer and the fallback are hidden while measuring, so
//       page chrome never counts as content. The canvas is measured alone, so the old
//       5% bar (tuned to ignore the nav) is lowered: a small subject on an empty
//       first beat (examples/recipes: 4.4%) is real content, a blank canvas is 0%.
import { couldNotRun, NOT_READY, step, waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const ONLY_CANVAS = "*{visibility:hidden!important}canvas{visibility:visible!important}";

/** Minimum fraction of pixels that must differ from the dominant color. */
const MIN_VARIED_FRACTION = 0.01;

const rule: Rule = {
  id: "render/not-blank",
  group: "render",
  severity: "error",
  description: "Screenshot must not be a single flat color (not blank, black, white or magenta).",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [couldNotRun(ctx, this.id, NOT_READY)];
    await step(ctx.page, 2);
    const box = await ctx.page
      .locator("canvas")
      .first()
      .boundingBox()
      .catch(() => null);
    if (!box || box.width < 1 || box.height < 1) {
      return [couldNotRun(ctx, this.id, "the page has no visible canvas")];
    }
    const style = await ctx.page.addStyleTag({ content: ONLY_CANVAS });
    const screenshotBuffer = await ctx.page
      .screenshot({ type: "png", clip: box })
      .catch(() => null);
    await style.evaluate((el) => (el as Element).remove()).catch(() => undefined);

    if (!screenshotBuffer) {
      return [
        {
          rule: "render/not-blank",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `Could not take a screenshot on ${ctx.viewport.name}.`,
          fix: `Ensure the page is accessible and Playwright can render it. Check for browser launch errors.`,
        },
      ];
    }

    const isBlank = await ctx.page
      .evaluate(
        async ({ dataUrl, minVariedFraction }) => {
          return new Promise<boolean | null>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const drawCtx = canvas.getContext("2d");
              if (!drawCtx) {
                resolve(null);
                return;
              }
              drawCtx.drawImage(img, 0, 0);
              const { data } = drawCtx.getImageData(0, 0, img.width, img.height);
              const total = img.width * img.height;
              const colorCounts = new Map<number, number>();
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i] ?? 0;
                const g = data[i + 1] ?? 0;
                const b = data[i + 2] ?? 0;
                // Pack RGB into a single integer for fast comparison
                const key = (r << 16) | (g << 8) | b;
                colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
              }
              let maxCount = 0;
              for (const count of colorCounts.values()) {
                if (count > maxCount) maxCount = count;
              }
              const dominantFraction = maxCount / total;
              resolve(dominantFraction > 1 - minVariedFraction);
            };
            img.onerror = () => resolve(null);
            img.src = dataUrl;
          });
        },
        {
          dataUrl: `data:image/png;base64,${screenshotBuffer.toString("base64")}`,
          minVariedFraction: MIN_VARIED_FRACTION,
        },
      )
      .catch(() => null);

    if (isBlank === null) {
      return [couldNotRun(ctx, this.id, "the screenshot could not be decoded")];
    }
    if (isBlank) {
      return [
        {
          rule: "render/not-blank",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `The page renders as a single flat color on ${ctx.viewport.name}.`,
          fix: `The canvas is likely rendering a solid black screen. Check that your scene has geometry, at least one light, and that the camera is positioned inside the scene. Look for WebGL context errors in the browser console.`,
        },
      ];
    }

    return [];
  },
};

export default rule;
