// Rule: load/failed-requests
// Pass: no network request (model, texture, script, font) answered with an error status
import { waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "load/failed-requests",
  group: "load",
  severity: "error",
  description: "No network request may fail with an HTTP error status.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const failed = await ctx.page.evaluate(() =>
      (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter((e) => e.responseStatus >= 400)
        .map((e) => ({ url: e.name, status: e.responseStatus })),
    );
    return failed.map((f) => ({
      rule: "load/failed-requests",
      severity: "error" as const,
      viewport: ctx.viewport.name,
      message: `Request failed with status ${f.status} on ${ctx.viewport.name}: ${f.url}`,
      fix: "Fix: put the missing file in public/ (or fix its path), or remove the reference to it.",
      evidence: { data: { url: f.url, status: f.status } },
    }));
  },
};

export default rule;
