#!/usr/bin/env node
// Entry point for `bevl check <url> [options]`
// Parse args, call runCheck, print with formatReport, exit with the right code.
// Flags: --json (print raw JSON), --viewport <name>, --rule <id>
import type { CheckOptions } from "../checker.js";
import { EXIT_CODES, formatReport, runCheck } from "../index.js";
import type { Report } from "../report.js";

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: bevl-check <url> [options]",
      "",
      "Options:",
      "  --json               Print the raw report JSON instead of formatted output",
      "  --viewport <name>    Run only this viewport (desktop or phone)",
      "  --rule <id>          Run only this rule (e.g. load/ready)",
      "  --seed <n>           Random seed (default: 1)",
      "  --project-dir <dir>  Project directory for report output (default: cwd)",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(EXIT_CODES.BAD_USAGE);
  }

  const url = args[0];
  if (url === undefined || url.startsWith("--")) {
    process.stderr.write("Error: <url> is required as the first argument.\n\n");
    printUsage();
    process.exit(EXIT_CODES.BAD_USAGE);
  }

  let jsonOutput = false;
  let viewportName: string | undefined;
  let ruleId: string | undefined;
  let seed: number | undefined;
  let projectDir = process.cwd();

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--viewport") {
      viewportName = args[++i];
    } else if (arg === "--rule") {
      ruleId = args[++i];
    } else if (arg === "--seed") {
      const raw = args[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        process.stderr.write(`Error: --seed must be a number, got: ${raw}\n`);
        process.exit(EXIT_CODES.BAD_USAGE);
      }
      seed = parsed;
    } else if (arg === "--project-dir") {
      const dir = args[++i];
      if (dir === undefined) {
        process.stderr.write("Error: --project-dir requires a value.\n");
        process.exit(EXIT_CODES.BAD_USAGE);
      }
      projectDir = dir;
    } else {
      process.stderr.write(`Error: unknown option: ${arg}\n\n`);
      printUsage();
      process.exit(EXIT_CODES.BAD_USAGE);
    }
  }

  // Build options, only including optional fields when they are defined
  // (exactOptionalPropertyTypes prevents passing undefined for optional props).
  const checkOptions: CheckOptions = { url, projectDir };
  if (seed !== undefined) checkOptions.seed = seed;
  if (viewportName !== undefined) checkOptions.viewportName = viewportName;
  if (ruleId !== undefined) checkOptions.ruleId = ruleId;

  let report: Report;
  try {
    report = await runCheck(checkOptions);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(EXIT_CODES.ENV_ERROR);
    return; // unreachable, but narrows the type for TypeScript
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatReport(report)}\n`);
  }

  process.exit(report.passed ? EXIT_CODES.PASSED : EXIT_CODES.FINDINGS);
}

main().catch((err) => {
  process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(EXIT_CODES.ENV_ERROR);
});
