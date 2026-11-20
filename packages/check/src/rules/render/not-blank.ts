// Rule: render/not-blank
// Pass: screenshot is not one flat color (not all black, not all white, not all
//       magenta). At least 5% of pixels must differ from the most common color.
import type { Rule } from "../../rule.js";

/** Minimum fraction of pixels that must differ from the dominant color. */
const MIN_VARIED_FRACTION = 0.05;

const rule: Rule = {
  id: "render/not-blank",
  group: "render",
  severity: "error",
  description: "Screenshot must not be a single flat color (not blank, black, white or magenta).",
  async run(ctx) {
    const screenshotBuffer = await ctx.page.screenshot({ type: "png" }).catch(() => null);

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

    // Decode PNG pixels using the raw buffer. Each pixel is 4 bytes (RGBA).
    // We only have the compressed PNG bytes here; use a lightweight check:
    // sample every Nth byte from the raw buffer to detect flat-color screens.
    // For the skeleton we decode using a minimal inline parser approach:
    // read raw pixels via page.evaluate on a canvas element drawn from the
    // screenshot DataURL.
    const isBlank = await ctx.page
      .evaluate(
        async ({ dataUrl, minVariedFraction }) => {
          return new Promise<boolean>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const drawCtx = canvas.getContext("2d");
              if (!drawCtx) {
                resolve(true);
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
            img.onerror = () => resolve(true);
            img.src = dataUrl;
          });
        },
        {
          dataUrl: `data:image/png;base64,${screenshotBuffer.toString("base64")}`,
          minVariedFraction: MIN_VARIED_FRACTION,
        },
      )
      .catch(() => true);

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
