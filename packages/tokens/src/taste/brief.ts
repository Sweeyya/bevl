import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { projectDirOf, resolveInside } from "../project/inside.js";

export const BRIEF_FILE = "toros.brief.json";

export const BRIEF_KINDS = [
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

export type BriefKind = (typeof BRIEF_KINDS)[number];

const briefSchema = z.strictObject({
  version: z.literal(1),
  name: z.string().min(1).max(80),
  kind: z.enum(BRIEF_KINDS),
  purpose: z.string().max(2000).default(""),
  audience: z.string().max(1000).default(""),
  tone: z.array(z.string().min(1).max(40)).max(12).default([]),
  sections: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z][a-z0-9-]*$/),
        title: z.string().min(1).max(80),
        copy: z.string().max(4000).exactOptional(),
      }),
    )
    .default([]),
  colors: z.enum(["given", "match-logo", "choose"]),
  avoid: z.array(z.string().min(1).max(120)).default([]),
  direction: z.string().min(1).exactOptional(),
  history: z.array(z.string().min(1)).exactOptional(),
});

export type Brief = z.output<typeof briefSchema>;

export type BriefResult = { ok: true; brief: Brief } | { ok: false; errors: string[] };

function describe(issue: z.core.$ZodIssue): string {
  const where = issue.path.length > 0 ? issue.path.join(".") : "brief";
  const key = String(issue.path[issue.path.length - 1] ?? "");
  let fix = `edit "${where}" to match the brief format`;
  if (issue.code === "invalid_value") fix = `set "${where}" to one of: ${issue.values.join(", ")}`;
  else if (issue.code === "unrecognized_keys") fix = `remove ${issue.keys.join(", ")}`;
  else if (key === "version") fix = 'set "version" to 1';
  else if (key === "id") fix = `use lowercase letters, numbers and dashes in "${where}"`;
  return `${where}: ${issue.message}. Fix: ${fix}.`;
}

export function validateBrief(json: unknown): BriefResult {
  const parsed = briefSchema.safeParse(json);
  if (parsed.success) return { ok: true, brief: parsed.data };
  return { ok: false, errors: parsed.error.issues.map(describe) };
}

export function parseBriefText(text: string, label = BRIEF_FILE): BriefResult {
  try {
    return validateBrief(JSON.parse(text));
  } catch {
    return { ok: false, errors: [`${label} is not valid JSON. Fix: repair the file.`] };
  }
}

export function briefOrThrow(result: BriefResult, label: string): Brief {
  if (result.ok) return result.brief;
  throw new Error(`${label} is not a valid brief:\n${result.errors.join("\n")}`);
}

export async function readBrief(dir: string): Promise<Brief> {
  const path = resolveInside(projectDirOf(dir), BRIEF_FILE);
  return briefOrThrow(parseBriefText(await readFile(path, "utf8"), BRIEF_FILE), BRIEF_FILE);
}

export async function writeBrief(dir: string, brief: Brief): Promise<void> {
  const path = resolveInside(projectDirOf(dir), BRIEF_FILE);
  await writeFile(path, `${JSON.stringify(brief, null, 2)}\n`);
}
