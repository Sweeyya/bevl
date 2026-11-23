import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { makeRunId, VIEWPORTS } from "./checker.js";
import { NO_SCROLL, NOT_READY, scrollTo, settleCamera, step, waitReady } from "./drive.js";

export type ShotViewport = "desktop" | "phone" | "both";

export interface ShotsOptions {
  url: string;
  projectDir: string;
  /** Output folder. Default: <projectDir>/.toros/shots/<run-id>. */
  outDir?: string;
  viewport?: ShotViewport;
}

export interface ShotFile {
  file: string;
  viewport: "desktop" | "phone";
  beat: number;
  section: string;
  title: string;
  progress: number;
}

export interface ShotsManifest {
  url: string;
  outDir: string;
  files: ShotFile[];
  contactSheets: string[];
}

export function shotFileName(viewport: string, beat: number, section: string): string {
  const slug = section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${viewport}-${String(beat + 1).padStart(2, "0")}-${slug || "screen"}.png`;
}

export function withTestMode(raw: string): string {
  const url = new URL(raw);
  url.searchParams.set("toros-test", "");
  return url.toString();
}

async function sectionTitles(projectDir: string): Promise<Map<string, string>> {
  try {
    const data = JSON.parse(await readFile(join(projectDir, "toros.json"), "utf8")) as {
      sections?: { id?: unknown; title?: unknown }[];
    };
    const titles = new Map<string, string>();
    for (const s of data.sections ?? [])
      if (typeof s.id === "string" && typeof s.title === "string") titles.set(s.id, s.title);
    return titles;
  } catch {
    return new Map();
  }
}

function shrink(src: PNG, width: number): PNG {
  const height = Math.max(1, Math.round((src.height * width) / src.width));
  const out = new PNG({ width, height });
  const fx = src.width / width;
  const fy = src.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      const y0 = Math.floor(y * fy);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
      const sum = [0, 0, 0, 0];
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++)
          for (let c = 0; c < 4; c++)
            sum[c] = (sum[c] ?? 0) + (src.data[(sy * src.width + sx) * 4 + c] ?? 0);
      const n = (x1 - x0) * (y1 - y0);
      for (let c = 0; c < 4; c++) out.data[(y * width + x) * 4 + c] = Math.round((sum[c] ?? 0) / n);
    }
  }
  return out;
}

export function contactSheet(images: Buffer[], cell: number, columns: number): Buffer {
  const gap = 8;
  const thumbs = images.map((b) => shrink(PNG.sync.read(b), cell));
  const rowHeight = Math.max(...thumbs.map((t) => t.height));
  const cols = Math.min(columns, thumbs.length);
  const rows = Math.ceil(thumbs.length / cols);
  const sheet = new PNG({
    width: gap + cols * (cell + gap),
    height: gap + rows * (rowHeight + gap),
  });
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = 40;
    sheet.data[i + 3] = 255;
  }
  thumbs.forEach((t, i) => {
    PNG.bitblt(
      t,
      sheet,
      0,
      0,
      t.width,
      t.height,
      gap + (i % cols) * (cell + gap),
      gap + Math.floor(i / cols) * (rowHeight + gap),
    );
  });
  return PNG.sync.write(sheet);
}

/** Opens the site in test mode and saves one PNG per screen (beat) for each viewport, plus a manifest. */
export async function captureShots(options: ShotsOptions): Promise<ShotsManifest> {
  const target = withTestMode(options.url);
  const outDir = options.outDir ?? join(options.projectDir, ".toros", "shots", makeRunId());
  const wanted = options.viewport ?? "both";
  const viewports = VIEWPORTS.filter((v) => wanted === "both" || v.name === wanted);
  const titles = await sectionTitles(options.projectDir);
  const files: ShotFile[] = [];
  const contactSheets: string[] = [];
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    throw new Error(
      `Failed to launch Chromium: ${err instanceof Error ? err.message : String(err)}. Fix: run "npx playwright install chromium".`,
    );
  });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });
      try {
        const page = await context.newPage();
        await page.goto(target, { waitUntil: "domcontentloaded" }).catch((err) => {
          throw new Error(
            `Could not open ${target}: ${err instanceof Error ? err.message : String(err)}. Fix: start the dev server (pnpm dev) and pass its URL.`,
          );
        });
        if (!(await waitReady(page)))
          throw new Error(
            `Could not take shots on ${viewport.name}: ${NOT_READY}. Fix: run the dev server or a preview build (test mode is disabled in production builds unless toros.json has "testMode": "always").`,
          );
        const sections = await page.evaluate(
          () =>
            (
              window as unknown as { __toros?: { sections(): { id: string; anchor: number }[] } }
            ).__toros?.sections() ?? [],
        );
        if (sections.length === 0)
          throw new Error(
            `Could not take shots on ${viewport.name}: the page has no beats. Fix: declare sections in the choreography and render a <Section> for each.`,
          );
        const images: Buffer[] = [];
        for (const [beat, section] of sections.entries()) {
          const at = section.anchor;
          if (!(await scrollTo(page, at)))
            throw new Error(
              `Could not take shots on ${viewport.name}: ${NO_SCROLL}. Fix: make sure a [data-toros-scroller] is taller than the viewport.`,
            );
          await step(page, 1);
          await settleCamera(page);
          await step(page, 10);
          const png = await page.screenshot({ type: "png" });
          const file = shotFileName(viewport.name, beat, section.id);
          await writeFile(join(outDir, file), png);
          images.push(png);
          files.push({
            file,
            viewport: viewport.name,
            beat,
            section: section.id,
            title: titles.get(section.id) ?? section.id,
            progress: at,
          });
        }
        const sheet = `${viewport.name}-contact-sheet.png`;
        const phone = viewport.name === "phone";
        await writeFile(
          join(outDir, sheet),
          contactSheet(images, phone ? 200 : 420, phone ? 5 : 3),
        );
        contactSheets.push(sheet);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const manifest: ShotsManifest = { url: target, outDir, files, contactSheets };
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function formatShots(m: ShotsManifest): string {
  const lines = m.files.map(
    (f) =>
      `${f.viewport} ${f.beat + 1}. ${f.title} (${f.progress.toFixed(3)})  ${join(m.outDir, f.file)}`,
  );
  const sheets = m.contactSheets.map((s) => `contact sheet  ${join(m.outDir, s)}`);
  return `${[...lines, ...sheets, `manifest       ${join(m.outDir, "manifest.json")}`].join("\n")}\n`;
}
