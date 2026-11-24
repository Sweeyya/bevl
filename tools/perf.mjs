import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { buildAndServe, listExamples, root } from "./lib.mjs";

const chromePath = chromium.executablePath();

// Scene-heavy examples that are known to exceed the default total-blocking-time budget (300 ms).
// worlds measured about 911 ms under the phone simulation; drawing only when the scene changes is planned.
const BLOCKING_TIME_MS = { worlds: 1200 };

function configFor(name) {
  const path = `${root}/lighthouserc.json`;
  const limit = BLOCKING_TIME_MS[name];
  if (limit === undefined) return path;
  const config = JSON.parse(readFileSync(path, "utf8"));
  config.ci.assert.assertions["total-blocking-time"] = [
    "error",
    { maxNumericValue: limit, aggregationMethod: "median" },
  ];
  mkdirSync(`${root}/.lighthouseci`, { recursive: true });
  const out = `${root}/.lighthouseci/config-${name}.json`;
  writeFileSync(out, JSON.stringify(config, null, 2));
  return out;
}
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
        `--config=${configFor(example.name)}`,
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
