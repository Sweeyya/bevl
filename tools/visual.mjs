import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { buildAndServe, listExamples } from "./lib.mjs";

const MAX_DIFF_RATIO = 0.005;
const PIXEL_THRESHOLD = 0.1;
const FRAMES_TO_SETTLE = 30;
const VIEWPORTS = [
  {
    name: "desktop",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  { name: "phone", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

const update = process.argv.includes("--update");
const here = dirname(fileURLToPath(import.meta.url));
const baselineDir = join(here, "__screenshots__", process.platform);
const outDir = join(here, "__screenshots__", "_results");
mkdirSync(baselineDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

async function capture(browser, url, viewport) {
  const { name: _name, width, height, ...device } = viewport;
  const context = await browser.newContext({ ...device, viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(`${url}?bevl-test&seed=1`);
  await page.waitForFunction(() => "__bevl" in window, undefined, { timeout: 30_000 });
  await page.evaluate(() => window.__bevl.ready);
  const anchors = await page.evaluate(() => window.__bevl.sections().map((s) => s.anchor));
  const first = anchors[0] ?? 0;
  const second = anchors[1] ?? 1;
  const positions = [0, (first + second) / 2, anchors.at(-1) ?? 1];
  const shots = [];
  for (const [i, fraction] of positions.entries()) {
    await page.evaluate(async (f) => {
      const el = document.querySelector("[data-bevl-scroller]");
      if (el) el.scrollTop = f * (el.scrollHeight - el.clientHeight);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, fraction);
    await page.evaluate((n) => window.__bevl.step((n * 1000) / 60), FRAMES_TO_SETTLE);
    shots.push({ index: i, png: await page.screenshot() });
  }
  await context.close();
  return shots;
}

function compare(baselinePng, actualPng, diffPath) {
  const a = PNG.sync.read(baselinePng);
  const b = PNG.sync.read(actualPng);
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, note: `size changed ${a.width}x${a.height} -> ${b.width}x${b.height}` };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const count = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: PIXEL_THRESHOLD,
  });
  if (count > 0) writeFileSync(diffPath, PNG.sync.write(diff));
  return { ratio: count / (a.width * a.height), note: "" };
}

const browser = await chromium.launch({ headless: true });
const missing = [];
const failures = [];
let total = 0;

for (const example of listExamples()) {
  const server = await buildAndServe(example);
  try {
    for (const viewport of VIEWPORTS) {
      for (const { index, png } of await capture(browser, server.url, viewport)) {
        const id = `${example.name}-${viewport.name}-${index}`;
        const baselinePath = join(baselineDir, `${id}.png`);
        total++;
        if (update) {
          writeFileSync(baselinePath, png);
          console.log(`updated ${id}`);
          continue;
        }
        if (!existsSync(baselinePath)) {
          missing.push(id);
          writeFileSync(join(outDir, `${id}-actual.png`), png);
          continue;
        }
        const diffPath = join(outDir, `${id}-diff.png`);
        const { ratio, note } = compare(readFileSync(baselinePath), png, diffPath);
        if (ratio > MAX_DIFF_RATIO) {
          writeFileSync(join(outDir, `${id}-actual.png`), png);
          failures.push(`${id}: ${(ratio * 100).toFixed(2)}% of pixels differ ${note}`.trim());
        } else {
          console.log(`ok ${id} (${(ratio * 100).toFixed(3)}% differ)`);
        }
      }
    }
  } finally {
    server.stop();
  }
}
await browser.close();

if (update) {
  console.log(`\nWrote ${total} baselines to ${baselineDir}`);
  process.exit(0);
}
if (missing.length > 0) {
  console.error(
    `\nNo ${process.platform} baselines for: ${missing.join(", ")}\n` +
      `Fix: run "pnpm test:visual -- --update" on this platform and commit tools/__screenshots__/${process.platform}/. ` +
      `For CI (linux) run the "Update visual baselines" workflow.`,
  );
}
if (failures.length > 0)
  console.error(
    `\nScreenshot differences (limit ${MAX_DIFF_RATIO * 100}%):\n  ${failures.join("\n  ")}`,
  );
process.exit(missing.length + failures.length > 0 ? 1 : 0);
