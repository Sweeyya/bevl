import type { RecipeKind } from "@toros/core";
import { recipeChoreography, recipeNames, recipes, recommendRecipes } from "@toros/core";
import { applyChoreography } from "@toros/tokens";
import type { Command } from "commander";

const KINDS = [
  "landing",
  "product",
  "portfolio",
  "gallery",
  "story",
  "venue",
  "saas",
  "event",
  "other",
] as const;

const out = (s: string): void => {
  process.stdout.write(`${s}\n`);
};

export function registerRecipeCommands(program: Command): void {
  const recipe = program.command("recipe").description("List, choose and apply scroll styles");

  recipe
    .command("list")
    .description("List the scroll styles")
    .option("--json", "Output JSON")
    .action((opts: { json?: boolean }) => {
      const list = recipeNames.map((n) => {
        const { name, description, whenToUse, feel } = recipes[n];
        return { name, description, whenToUse, feel };
      });
      out(
        opts.json
          ? JSON.stringify(list, null, 2)
          : list.map((r) => `${r.name}\n  ${r.description}\n  Use when: ${r.whenToUse}`).join("\n"),
      );
    });

  recipe
    .command("recommend")
    .description("Rank the scroll styles for a site")
    .requiredOption("--kind <kind>", KINDS.join(" | "))
    .requiredOption("--sections <n>", "Number of sections")
    .option("--tone <words>", "Comma-separated mood words")
    .option("--hero", "The site shows one hero object")
    .option("--json", "Output JSON")
    .action(
      (opts: { kind: string; sections: string; tone?: string; hero?: boolean; json?: boolean }) => {
        if (!(KINDS as readonly string[]).includes(opts.kind)) {
          throw new Error(`Unknown kind "${opts.kind}". Fix: use one of ${KINDS.join(", ")}.`);
        }
        const sectionCount = Number(opts.sections);
        if (!Number.isInteger(sectionCount) || sectionCount < 1) {
          throw new Error("Invalid --sections. Fix: pass a whole number of at least 1.");
        }
        const ranking = recommendRecipes({
          kind: opts.kind as RecipeKind,
          sectionCount,
          ...(opts.tone !== undefined && { tone: opts.tone.split(",").map((t) => t.trim()) }),
          ...(opts.hero && { heroObject: true }),
        });
        out(
          opts.json
            ? JSON.stringify(ranking, null, 2)
            : ranking.map((r) => `${r.name} (${r.score}): ${r.reasons.join("; ")}`).join("\n"),
        );
      },
    );

  recipe
    .command("apply <name>")
    .description("Write a scroll style's choreography into toros.json")
    .option("--project-dir <dir>", "Project folder", process.cwd())
    .action(async (name: string, opts: { projectDir: string }) => {
      out(
        (
          await applyChoreography({
            dir: opts.projectDir,
            build: (ids) => recipeChoreography(name, ids),
          })
        ).join("\n"),
      );
    });
}
