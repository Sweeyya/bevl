import { type Knowledge, knowledgeSchema } from "./schema.js";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export type ParseResult = { ok: true; entry: Knowledge } | { ok: false; error: string };

export function parseKnowledge(
  text: string,
  file: string,
  source: Knowledge["source"],
): ParseResult {
  const match = FRONTMATTER.exec(text.replace(/\r\n/g, "\n"));
  if (!match) {
    return {
      ok: false,
      error: `${file}: no frontmatter. Fix: start the file with --- id, kind, title, tags --- .`,
    };
  }
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  const parsed = knowledgeSchema.safeParse({
    id: fields.id,
    kind: fields.kind,
    title: fields.title,
    tags: (fields.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    ...(fields.seen !== undefined && { seen: Number(fields.seen) }),
    body: (match[2] ?? "").trim(),
    source,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `${file}: ${issue?.path.join(".") || "entry"} ${issue?.message ?? "is invalid"}. Fix: see docs/plans/knowledge-layer.md for the format.`,
    };
  }
  return { ok: true, entry: parsed.data };
}

export function formatKnowledge(entry: Omit<Knowledge, "source">): string {
  const lines = [
    "---",
    `id: ${entry.id}`,
    `kind: ${entry.kind}`,
    `title: ${entry.title}`,
    `tags: ${entry.tags.join(", ")}`,
    ...(entry.seen !== undefined ? [`seen: ${entry.seen}`] : []),
    "---",
    entry.body,
    "",
  ];
  return lines.join("\n");
}
