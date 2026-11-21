#!/usr/bin/env node
import { Command } from "commander";
import { checkSite } from "./commands/check.js";
import { createSite } from "./commands/create.js";
import { optimizeAssets } from "./commands/optimize.js";
import { VERSION } from "./index.js";

const program = new Command();

program.name("doodley").description("Generate, check, and optimize 3D websites.").version(VERSION);

program
  .command("create <name>")
  .description("Scaffold a new Doodley site")
  .option("-d, --dir <dir>", "Parent directory", process.cwd())
  .action(async (name: string, opts: { dir: string }) => {
    await createSite({ name, dir: opts.dir });
    process.stdout.write(`Created site: ${name}\n`);
  });

program
  .command("check <url>")
  .description("Run the checker against a running site")
  .option("--project-dir <dir>", "Project root", process.cwd())
  .option("--seed <n>", "Random seed", "1")
  .option("--viewport <name>", "Run only this viewport (desktop|phone)")
  .option("--rule <id>", "Run only this rule")
  .option("--json", "Output raw JSON report")
  .action(
    async (
      url: string,
      opts: { projectDir: string; seed: string; viewport?: string; rule?: string; json?: boolean },
    ) => {
      const code = await checkSite({
        url,
        projectDir: opts.projectDir,
        seed: Number(opts.seed),
        ...(opts.viewport !== undefined && { viewport: opts.viewport }),
        ...(opts.rule !== undefined && { rule: opts.rule }),
        ...(opts.json !== undefined && { json: opts.json }),
      });
      process.exit(code);
    },
  );

program
  .command("optimize <file>")
  .description("Shrink a GLB file using glTF Transform")
  .option("-o, --output <path>", "Output file path")
  .option("--texture-size <px>", "Max texture size in px", "1024")
  .action(async (file: string, opts: { output?: string; textureSize: string }) => {
    await optimizeAssets({
      input: file,
      ...(opts.output !== undefined && { output: opts.output }),
      textureSize: Number(opts.textureSize),
    });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
