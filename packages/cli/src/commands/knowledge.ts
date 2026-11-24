import {
  getKnowledge,
  type KnowledgeMatch,
  lintKnowledge,
  loadKnowledge,
  recordLesson,
  searchKnowledge,
} from "@toros/tokens";
import type { Command } from "commander";

const out = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

const csv = (value: string): string[] =>
  value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const line = (m: KnowledgeMatch): string =>
  `${m.id} [${m.kind}${m.seen ? `, seen ${m.seen}` : ""}] ${m.title}\n  ${m.summary}`;

export function registerKnowledgeCommands(program: Command): void {
  const knowledge = program
    .command("knowledge")
    .description("Craft notes and lessons learned. Bundled, plus .toros/knowledge in the project");

  knowledge
    .command("list")
    .description("List every note and lesson")
    .option("--kind <kind>", "note or lesson")
    .option("-d, --project-dir <dir>", "Project folder", ".")
    .option("--json", "Print JSON")
    .action((opts: { kind?: string; projectDir: string; json?: boolean }) => {
      const kind = opts.kind === "note" || opts.kind === "lesson" ? opts.kind : undefined;
      const matches = searchKnowledge(loadKnowledge({ projectDir: opts.projectDir }).entries, {
        ...(kind && { kind }),
        limit: 500,
      });
      if (opts.json) return out(JSON.stringify(matches, null, 2));
      for (const m of matches) out(line(m));
    });

  knowledge
    .command("search")
    .description(
      "Find notes and lessons by free text or tags. Then run `show <id>` for the full text",
    )
    .option("--text <words>", "Free text, e.g. 'dark brand looks black'")
    .option("--tags <tags>", "Comma separated tags, e.g. lighting,dark")
    .option("--kind <kind>", "note or lesson")
    .option("--limit <n>", "How many results", "5")
    .option("-d, --project-dir <dir>", "Project folder", ".")
    .option("--json", "Print JSON")
    .action(
      (opts: {
        text?: string;
        tags?: string;
        kind?: string;
        limit: string;
        projectDir: string;
        json?: boolean;
      }) => {
        if (opts.kind && opts.kind !== "note" && opts.kind !== "lesson") {
          throw new Error(`Unknown kind "${opts.kind}". Fix: use note or lesson.`);
        }
        const limit = Number(opts.limit);
        if (!Number.isInteger(limit) || limit < 1) {
          throw new Error(`Invalid limit "${opts.limit}". Fix: pass a whole number of 1 or more.`);
        }
        const matches = searchKnowledge(loadKnowledge({ projectDir: opts.projectDir }).entries, {
          ...(opts.text && { text: opts.text }),
          ...(opts.tags && { tags: csv(opts.tags) }),
          ...(opts.kind && { kind: opts.kind as "note" | "lesson" }),
          limit,
        });
        if (opts.json) return out(JSON.stringify(matches, null, 2));
        if (matches.length === 0) return out("Nothing matches. Try fewer or different words.");
        for (const m of matches) out(`${line(m)}\n  why: ${m.reasons.join("; ")}`);
      },
    );

  knowledge
    .command("show <id>")
    .description("Print one note or lesson in full (JSON)")
    .option("-d, --project-dir <dir>", "Project folder", ".")
    .action((id: string, opts: { projectDir: string }) => {
      const entry = getKnowledge(loadKnowledge({ projectDir: opts.projectDir }).entries, id);
      if (!entry) {
        throw new Error(
          `No entry "${id}". Fix: run \`toros knowledge search\` and use an id from it.`,
        );
      }
      out(JSON.stringify(entry, null, 2));
    });

  knowledge
    .command("add-lesson <id>")
    .description(
      "Record a lesson in .toros/knowledge/lessons. Saying it again raises its seen count",
    )
    .requiredOption("--title <title>", "Short title")
    .requiredOption("--tags <tags>", "Comma separated lowercase tags")
    .requiredOption("--mistake <text>", "What went wrong")
    .requiredOption("--rule <text>", "What to do instead")
    .option("-d, --project-dir <dir>", "Project folder", ".")
    .action(
      (
        id: string,
        opts: { title: string; tags: string; mistake: string; rule: string; projectDir: string },
      ) => {
        const result = recordLesson(opts.projectDir, {
          id,
          title: opts.title,
          tags: csv(opts.tags),
          mistake: opts.mistake,
          rule: opts.rule,
        });
        out(`${result.created ? "Saved" : "Updated"} ${result.path} (seen ${result.seen}).`);
      },
    );

  knowledge
    .command("lint")
    .description("Find unreadable files, duplicate ids and titles, and near-duplicate entries")
    .option("-d, --project-dir <dir>", "Project folder", ".")
    .action((opts: { projectDir: string }) => {
      const { entries, problems } = loadKnowledge({ projectDir: opts.projectDir });
      const all = [...problems, ...lintKnowledge(entries)];
      if (all.length === 0) return out(`${entries.length} entries, no problems.`);
      for (const p of all) out(p);
      process.exitCode = 1;
    });
}
