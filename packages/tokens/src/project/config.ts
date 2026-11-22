import { readFile, writeFile } from "node:fs/promises";

export interface ProjectConfig {
  sections: { id: string; title: string }[];
  choreography?: { beats: { id: string; at: number; snap?: boolean }[] };
  brand?: string;
  [key: string]: unknown;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export async function readConfig(path: string): Promise<ProjectConfig> {
  let data: unknown;
  try {
    data = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(
      `${path} is not valid JSON. Fix: repair it or restore it from version control.`,
    );
  }
  const sections = isObject(data) ? data.sections : undefined;
  const ok =
    Array.isArray(sections) &&
    sections.every((s) => isObject(s) && typeof s.id === "string" && typeof s.title === "string");
  if (!isObject(data) || !ok) {
    throw new Error(
      `${path} must be an object with a "sections" array of { id, title }. Fix: repair doodley.json.`,
    );
  }
  const beats = isObject(data.choreography) ? data.choreography.beats : undefined;
  if (
    data.choreography !== undefined &&
    !(
      Array.isArray(beats) &&
      beats.every((b) => isObject(b) && typeof b.id === "string" && typeof b.at === "number")
    )
  ) {
    throw new Error(
      `${path} has a "choreography" without a valid "beats" array. Fix: repair doodley.json.`,
    );
  }
  return data as ProjectConfig;
}

export function writeJson(path: string, value: unknown): Promise<void> {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
