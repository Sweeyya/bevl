import { resolve } from "node:path";
import { formatReport, runCheck } from "@toros/check";

export interface CheckCommandOptions {
  url: string;
  projectDir?: string;
  seed?: number;
  viewport?: string;
  rule?: string;
  json?: boolean;
}

export async function checkSite(opts: CheckCommandOptions): Promise<number> {
  const projectDir = resolve(opts.projectDir ?? process.cwd());
  const report = await runCheck({
    url: opts.url,
    projectDir,
    ...(opts.seed !== undefined && { seed: opts.seed }),
    ...(opts.viewport !== undefined && { viewportName: opts.viewport }),
    ...(opts.rule !== undefined && { ruleId: opts.rule }),
  });

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatReport(report));
  }

  return report.passed ? 0 : 1;
}
