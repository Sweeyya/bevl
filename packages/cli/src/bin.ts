#!/usr/bin/env node
import { resolve } from "node:path";
import { addSection, applyBrand, createSite } from "@toros/tokens";
import { Command } from "commander";
import { checkSite } from "./commands/check.js";
import { optimizeAssets } from "./commands/optimize.js";
import { shots } from "./commands/shots.js";
import { VERSION } from "./index.js";

const program = new Command();

program.name("toros").description("Generate, check, and optimize 3D websites.").version(VERSION);

program
  .command("create <name>")
  .description("Scaffold a new Toros site")
  .option("-d, --dir <dir>", "Parent directory", process.cwd())
  .action(async (name: string, opts: { dir: string }) => {
    await createSite({ name, dir: opts.dir });
    process.stdout.write(`Created site: ${name}\n`);
  });

program
  .command("add-section <id> <title>")
  .description("Add a section to toros.json (and src/App.tsx when it can)")
  .option("-d, --dir <dir>", "Project folder", process.cwd())
  .action(async (id: string, title: string, opts: { dir: string }) => {
    const notes = await addSection({ dir: opts.dir, id, title });
    process.stdout.write(`${notes.join("\n")}\n`);
  });

program
  .command("apply-brand <file>")
  .description("Read a DESIGN.md or token JSON file and write src/brand.tokens.json")
  .option("-d, --dir <dir>", "Project folder", process.cwd())
  .action(async (file: string, opts: { dir: string }) => {
    const lines = await applyBrand({ dir: opts.dir, file: resolve(file) });
    process.stdout.write(`${lines.join("\n")}\n`);
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
  .command("shots <url>")
  .description("Save a screenshot of every screen of a running site, so you can look at it")
  .option("--project-dir <dir>", "Project root", process.cwd())
  .option("--out <dir>", "Output folder (default: .toros/shots/<run-id>)")
  .option("--viewport <name>", "desktop, phone or both", "both")
  .option("--json", "Print the manifest as JSON")
  .action(
    async (
      url: string,
      opts: { projectDir: string; out?: string; viewport: string; json?: boolean },
    ) => {
      process.exit(
        await shots({
          url,
          projectDir: opts.projectDir,
          viewport: opts.viewport,
          ...(opts.out !== undefined && { out: opts.out }),
          ...(opts.json !== undefined && { json: opts.json }),
        }),
      );
    },
  );

program
  .command("optimize <file>")
  .description("Shrink a GLB file using glTF Transform")
  .option("-o, --output <path>", "Output file path")
  .option("--texture-size <px>", "Max texture size in px (with --textures)", "1024")
  .option("--draco", "Compress geometry with Draco (needs the draco3dgltf package)")
  .option("--textures", "Resize textures and convert to WebP (needs the sharp package)")
  .action(
    async (
      file: string,
      opts: { output?: string; textureSize: string; draco?: boolean; textures?: boolean },
    ) => {
      await optimizeAssets({
        input: file,
        ...(opts.output !== undefined && { output: opts.output }),
        textureSize: Number(opts.textureSize),
        ...(opts.draco && { draco: true }),
        ...(opts.textures && { textures: true }),
      });
    },
  );

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
