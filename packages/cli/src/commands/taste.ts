import { readFile } from "node:fs/promises";
import { type Brief, briefOrThrow, dealForBrief, directions, parseBriefText } from "@toros/tokens";
import type { Command } from "commander";

const out = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

async function loadBrief(file: string): Promise<Brief> {
  return briefOrThrow(parseBriefText(await readFile(file, "utf8"), file), file);
}

export function registerTasteCommands(program: Command): void {
  program
    .command("brief")
    .description("Work with toros.brief.json")
    .command("validate <file>")
    .description("Check a brief file and print every problem with a Fix line")
    .option("--json", "Print JSON")
    .action(async (file: string, opts: { json?: boolean }) => {
      const result = parseBriefText(await readFile(file, "utf8"), file);
      if (opts.json) out(JSON.stringify(result, null, 2));
      else if (result.ok)
        out(`${file} is a valid brief (${result.brief.kind}, "${result.brief.name}").`);
      else out(result.errors.join("\n"));
      if (!result.ok) process.exitCode = 1;
    });

  const taste = program.command("taste").description("Toros's own art directions");

  taste
    .command("list")
    .description("List the art directions")
    .option("--json", "Print JSON")
    .action((opts: { json?: boolean }) => {
      if (opts.json) return out(JSON.stringify(directions, null, 2));
      for (const d of directions) {
        out(
          `${d.id}: ${d.name}. ${d.description}\n  suits: ${d.kinds.join(", ")}; scroll: ${d.scrollStyles.join(", ")}`,
        );
      }
    });

  taste
    .command("deal")
    .description("Deal an art direction for a brief; --apply writes src/brand.tokens.json")
    .requiredOption("--brief <file>", "Brief file")
    .option("--seed <n>", "Seed", "1")
    .option("--apply", "Write the tokens and record direction and history in toros.brief.json")
    .option("-d, --dir <dir>", "Project folder (with --apply)", process.cwd())
    .option("--json", "Print JSON")
    .action(
      async (opts: {
        brief: string;
        seed: string;
        apply?: boolean;
        dir: string;
        json?: boolean;
      }) => {
        const brief = await loadBrief(opts.brief);
        const seed = Number(opts.seed);
        if (!Number.isInteger(seed) || seed < 0) {
          throw new Error(`Invalid seed "${opts.seed}". Fix: pass a whole number of 0 or more.`);
        }
        const { direction, notes } = await dealForBrief({
          brief,
          seed,
          ...(opts.apply && { dir: opts.dir }),
        });
        if (opts.json) return out(JSON.stringify({ direction, applied: notes }, null, 2));
        out(`Dealt "${direction.name}" (${direction.id}): ${direction.description}`);
        out(`Scroll styles, best first: ${direction.scrollStyles.join(", ")}.`);
        out(notes.length > 0 ? notes.join("\n") : "Not applied. Re-run with --apply to write it.");
      },
    );
}
