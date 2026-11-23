import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import type { Report } from "./report.js";
import rules from "./rules/index.js";
import { calculateScore } from "./score.js";

export interface CheckOptions {
  url: string;
  projectDir: string;
  seed?: number;
  /** Run only this viewport (desktop or phone). */
  viewportName?: string;
  /** Run only this rule id. */
  ruleId?: string;
}

const VIEWPORTS = [
  {
    name: "desktop",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "phone",
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
] as const;

/** Generate a short run ID: ISO timestamp + 4 random hex chars. */
function makeRunId(): string {
  const ts = `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}Z`;
  const suffix = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `${ts}-${suffix}`;
}

/** Build the test URL by appending toros-test query params. */
function testUrl(base: string, seed: number): string {
  const url = new URL(base);
  url.searchParams.set("toros-test", "");
  url.searchParams.set("seed", String(seed));
  return url.toString();
}

export async function runCheck(options: CheckOptions): Promise<Report> {
  const seed = options.seed ?? 1;
  const runId = makeRunId();
  const targetUrl = testUrl(options.url, seed);

  const activeViewports =
    options.viewportName !== undefined
      ? VIEWPORTS.filter((v) => v.name === options.viewportName)
      : [...VIEWPORTS];

  const activeRules =
    options.ruleId !== undefined ? rules.filter((r) => r.id === options.ruleId) : rules;

  const allRuleIds = activeRules.map((r) => r.id);
  const allFindings: import("./report.js").Finding[] = [];
  const timings: import("./report.js").RuleTiming[] = [];
  const renderers: { desktop?: string; phone?: string } = {};

  const browser = await chromium.launch({ headless: true }).catch((err) => {
    throw new Error(
      `Failed to launch Chromium: ${err instanceof Error ? err.message : String(err)}. ` +
        `Run "npx playwright install chromium" to install the browser.`,
    );
  });

  try {
    for (const viewport of activeViewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      const page = await context.newPage();

      // Collect console errors into window.__torosConsoleErrors so the
      // load/console-errors rule can read them.
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });

      await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(
        () => undefined, // navigation errors are caught by the rules themselves
      );

      // Record the WebGL renderer string.
      const renderer = await page
        .evaluate(() => {
          const canvas = document.createElement("canvas");
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          if (!gl) return null;
          const ext = gl.getExtension("WEBGL_debug_renderer_info");
          if (!ext) return null;
          return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        })
        .catch(() => null);

      if (renderer !== null) {
        renderers[viewport.name as "desktop" | "phone"] = renderer;
      }

      const ruleCtx = {
        page,
        viewport: {
          name: viewport.name,
          width: viewport.width,
          height: viewport.height,
          isMobile: viewport.isMobile,
        },
        url: targetUrl,
        projectDir: options.projectDir,
      };

      for (const rule of activeRules) {
        await page
          .evaluate((errors) => {
            (window as unknown as { __torosConsoleErrors: string[] }).__torosConsoleErrors = errors;
          }, consoleErrors)
          .catch(() => undefined);
        const started = performance.now();
        const findings = await rule.run(ruleCtx).catch((err) => [
          {
            rule: rule.id,
            severity: "error" as const,
            viewport: viewport.name,
            message: `Rule threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
            fix: `Check the rule implementation for ${rule.id}.`,
          },
        ]);
        allFindings.push(...findings);
        timings.push({
          rule: rule.id,
          viewport: viewport.name,
          ms: Math.round(performance.now() - started),
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Update injected console errors just before scoring (they were already
  // collected per-viewport above).
  const { score, passed, groups } = calculateScore(allFindings, allRuleIds);

  const baseReport = {
    runId,
    tool: { name: "toros", version: "0.1.0" },
    project: options.projectDir.split("/").pop() ?? options.projectDir,
    seed,
    score,
    passed,
    groups,
    findings: allFindings,
    timings,
    artifacts: [] as string[],
  };
  const report: Report =
    Object.keys(renderers).length > 0
      ? { ...baseReport, renderer: renderers as { desktop?: string; phone?: string } }
      : baseReport;

  // Write report to <projectDir>/.toros/reports/<runId>/report.json
  const reportDir = join(options.projectDir, ".toros", "reports", runId);
  await mkdir(reportDir, { recursive: true });
  await writeFile(join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  return report;
}
