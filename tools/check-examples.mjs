import { formatReport, runCheck } from "@bevl/check";
import { buildAndServe, listExamples } from "./lib.mjs";

const MIN_SCORE = 90;
const determinism = process.argv.includes("--determinism");
const comparable = (r) =>
  JSON.stringify({ score: r.score, groups: r.groups, findings: r.findings });

let failed = false;
for (const example of listExamples()) {
  const server = await buildAndServe(example);
  try {
    const options = { url: server.url, projectDir: example.dir };
    const report = await runCheck(options);
    const errors = report.findings.filter((f) => f.severity === "error").length;
    const ok = report.score >= MIN_SCORE && errors === 0;
    console.log(
      `\n== ${example.name}: ${report.score}/100, ${errors} errors, ${ok ? "ok" : "FAILED"}`,
    );
    if (!ok) console.log(formatReport(report));
    failed ||= !ok;

    if (determinism) {
      const again = await runCheck(options);
      const same = comparable(report) === comparable(again);
      console.log(
        `   determinism: ${same ? "identical across two runs" : "DIFFERENT across two runs"}`,
      );
      if (!same) {
        console.log(`   run 1 score ${report.score}, run 2 score ${again.score}`);
        failed = true;
      }
    }
  } catch (err) {
    console.error(`\n== ${example.name}: could not run check: ${err.message}`);
    failed = true;
  } finally {
    server.stop();
  }
}
process.exit(failed ? 1 : 0);
