import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { buildAndServe, listExamples, root } from "./lib.mjs";

const chromePath = chromium.executablePath();
let failed = false;

for (const example of listExamples()) {
  const server = await buildAndServe(example);
  try {
    console.log(`\n== Lighthouse: ${example.name}`);
    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "lhci",
        "autorun",
        `--config=${root}/lighthouserc.json`,
        `--collect.url=${server.url}`,
        `--upload.outputDir=${root}/.lighthouseci/${example.name}`,
      ],
      { cwd: root, stdio: "inherit", env: { ...process.env, CHROME_PATH: chromePath } },
    );
    failed ||= result.status !== 0;
  } finally {
    server.stop();
  }
}
process.exit(failed ? 1 : 0);
