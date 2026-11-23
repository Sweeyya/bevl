import {
  BRIEF_KINDS,
  type BriefKind,
  getReference,
  references,
  searchReferences,
} from "@toros/tokens";
import type { Command } from "commander";

const out = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

export function registerReferenceCommands(program: Command): void {
  const reference = program
    .command("reference")
    .description("Reference sites and the looks Toros can build from them");

  reference
    .command("list")
    .description("List every reference")
    .option("--json", "Print JSON")
    .action((opts: { json?: boolean }) => {
      if (opts.json) return out(JSON.stringify(references, null, 2));
      for (const r of references) {
        out(`${r.id} [${r.priority}, ${r.feasibility}]: ${r.title}\n  ${r.summary}`);
      }
    });

  reference
    .command("show <id>")
    .description("Show one reference in full (always JSON)")
    .action((id: string) => {
      const entry = getReference(id);
      if (!entry) {
        throw new Error(
          `No reference "${id}". Fix: run \`toros reference list\` and use one of the ids.`,
        );
      }
      out(JSON.stringify(entry, null, 2));
    });

  reference
    .command("search")
    .description("Find the references closest to a kind of site, mood words or free text")
    .option("--kind <kind>", `One of: ${BRIEF_KINDS.join(", ")}`)
    .option("--tone <words>", "Comma separated mood words, e.g. dark,atmospheric")
    .option("--archetype <name>", "Archetype, e.g. gallery-hall")
    .option("--text <words>", "Free text to match against the descriptions")
    .option("--limit <n>", "How many results", "5")
    .option("--json", "Print JSON")
    .action(
      (opts: {
        kind?: string;
        tone?: string;
        archetype?: string;
        text?: string;
        limit: string;
        json?: boolean;
      }) => {
        if (opts.kind && !(BRIEF_KINDS as readonly string[]).includes(opts.kind)) {
          throw new Error(
            `Unknown kind "${opts.kind}". Fix: use one of ${BRIEF_KINDS.join(", ")}.`,
          );
        }
        const limit = Number(opts.limit);
        if (!Number.isInteger(limit) || limit < 1) {
          throw new Error(`Invalid limit "${opts.limit}". Fix: pass a whole number of 1 or more.`);
        }
        const matches = searchReferences({
          ...(opts.kind && { kind: opts.kind as BriefKind }),
          ...(opts.tone && { tone: opts.tone.split(",") }),
          ...(opts.archetype && { archetype: opts.archetype }),
          ...(opts.text && { text: opts.text }),
          limit,
        });
        if (opts.json) return out(JSON.stringify(matches, null, 2));
        if (matches.length === 0) return out("No references match. Try fewer or different words.");
        for (const m of matches) {
          out(
            `${m.reference.id} (score ${m.score}): ${m.reference.summary}\n  why: ${m.reasons.join("; ")}`,
          );
        }
      },
    );
}
