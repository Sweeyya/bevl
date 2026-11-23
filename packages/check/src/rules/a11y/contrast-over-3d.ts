// Rule: a11y/contrast-over-3d
// Pass: text over the rendered 3D scene has WCAG contrast (4.5:1, or 3:1 for large text) at every beat

import {
  backingPanelColor,
  contrastRatio,
  hexToRgb,
  type Rgb,
  requiredRatio,
  suggestedColor,
} from "../../contrast.js";
import { beatAnchors, scrollTo, step, waitReady } from "../../drive.js";
import type { Finding } from "../../report.js";
import type { Rule } from "../../rule.js";

const TEXT_SELECTOR = "nav a, nav button, h1, h2, h3, h4, p, li, label";
const HIDE_TEXT =
  "*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important}";
const SAMPLE_GRID = 12;

interface TextBox {
  text: string;
  color: Rgb;
  fontSize: number;
  fontWeight: number;
  box: { x: number; y: number; width: number; height: number };
}

function readTextBoxes(selector: string): TextBox[] {
  const boxes: TextBox[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (!own) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    let opacity = 1;
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    if (opacity < 0.1) continue;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, r.left);
    const y = Math.max(0, r.top);
    const width = Math.min(innerWidth, r.right) - x;
    const height = Math.min(innerHeight, r.bottom) - y;
    if (width < 2 || height < 2) continue;
    const m = style.color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    boxes.push({
      text: own.slice(0, 40),
      color: [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0],
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight) || 400,
      box: { x, y, width, height },
    });
  }
  return boxes;
}

async function samplePixels(
  page: import("playwright").Page,
  png: string,
  boxes: TextBox["box"][],
  scale: number,
  grid: number,
): Promise<Rgb[][]> {
  return page.evaluate(
    async ({ png, boxes, scale, grid }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const g = canvas.getContext("2d");
      if (!g) return boxes.map(() => []);
      g.drawImage(img, 0, 0);
      return boxes.map((b) => {
        const pixels: Rgb[] = [];
        for (let i = 0; i < grid; i++) {
          for (let j = 0; j < grid; j++) {
            const x = Math.floor((b.x + ((i + 0.5) / grid) * b.width) * scale);
            const y = Math.floor((b.y + ((j + 0.5) / grid) * b.height) * scale);
            const d = g.getImageData(x, y, 1, 1).data;
            pixels.push([d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]);
          }
        }
        return pixels;
      });
    },
    { png, boxes, scale, grid },
  );
}

function readBrandSurfaces(): string[] {
  const brand = (
    window as unknown as {
      __toros?: { brand(): { colors: { surface: string; background: string } } | null };
    }
  ).__toros?.brand();
  return brand ? [brand.colors.surface, brand.colors.background] : [];
}

const rule: Rule = {
  id: "a11y/contrast-over-3d",
  group: "a11y",
  severity: "error",
  description: "Text over the 3D scene must have at least 4.5:1 contrast (3:1 for large text).",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];
    const scale = await page.evaluate(() => window.devicePixelRatio);
    const anchors = await beatAnchors(page);
    const surfaces = (await page.evaluate(readBrandSurfaces))
      .map(hexToRgb)
      .filter((c): c is Rgb => c !== null);
    const findings: Finding[] = [];
    const reported = new Set<string>();

    for (const anchor of anchors) {
      await scrollTo(page, anchor);
      await step(page, 3);
      const boxes = await page.evaluate(readTextBoxes, TEXT_SELECTOR);
      if (boxes.length === 0) continue;
      const style = await page.addStyleTag({ content: HIDE_TEXT });
      await step(page, 1);
      const png = (await page.screenshot({ type: "png" })).toString("base64");
      await style.evaluate((el) => (el as Element).remove());

      const samples = await samplePixels(
        page,
        png,
        boxes.map((b) => b.box),
        scale,
        SAMPLE_GRID,
      );
      boxes.forEach((b, i) => {
        const pixels = samples[i] ?? [];
        if (pixels.length === 0) return;
        const worst = pixels.reduce((a, p) =>
          contrastRatio(b.color, p) < contrastRatio(b.color, a) ? p : a,
        );
        const ratio = contrastRatio(b.color, worst);
        const required = requiredRatio(b.fontSize, b.fontWeight);
        const key = `${b.text}`;
        if (ratio >= required || reported.has(key)) return;
        reported.add(key);
        findings.push({
          rule: "a11y/contrast-over-3d",
          severity: "error",
          viewport: viewport.name,
          message: `"${b.text}" has contrast ${ratio.toFixed(1)}:1 over the 3D scene at progress ${anchor.toFixed(2)} on ${viewport.name} (needs ${required}:1).`,
          fix: `Fix: keep the brand and put a backing panel behind the text: background: ${backingPanelColor(b.color, surfaces, worst)}; padding: 1rem. If it still fails, raise the opacity, or as a second option change the text color to ${suggestedColor(worst)}.`,
          evidence: {
            data: { ratio, required, suggestedColor: suggestedColor(worst), progress: anchor },
          },
        });
      });
    }
    return findings;
  },
};

export default rule;
