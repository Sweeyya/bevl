import { readFile, writeFile } from "node:fs/promises";
import { readConfig, writeJson } from "./config.js";
import { projectDirOf, resolveInside } from "./inside.js";

export interface AddSectionOptions {
  dir: string;
  id: string;
  title: string;
}

const ID = /^[a-z][a-z0-9-]{0,39}$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const ANCHOR = /^(\s*)<ambientLight\b/m;
const COLORS = ["#e94560", "#0f3460", "#16213e", "#2a9d8f", "#457b9d"];

export function validateSectionId(id: string): string {
  if (!ID.test(id)) {
    throw new Error(
      `Invalid section id "${id}". Fix: use 1-40 characters: a lowercase letter first, then lowercase letters, numbers or dashes.`,
    );
  }
  return id;
}

export function validateSectionTitle(title: string): string {
  if (title.length < 1 || title.length > 80 || CONTROL.test(title)) {
    throw new Error("Invalid section title. Fix: use 1-80 characters with no control characters.");
  }
  return title;
}

function sectionBlock(indent: string, id: string, title: string, index: number): string {
  const color = COLORS[index % COLORS.length];
  return [
    `<Section id="${id}" title={${JSON.stringify(title)}}>`,
    "  <mesh>",
    "    <boxGeometry args={[2, 2, 2]} />",
    `    <meshStandardMaterial color="${color}" />`,
    "  </mesh>",
    "</Section>",
  ]
    .map((l) => `${indent}${l}`)
    .join("\n");
}

export async function addSection(opts: AddSectionOptions): Promise<string[]> {
  const id = validateSectionId(opts.id);
  const title = validateSectionTitle(opts.title);
  const root = projectDirOf(opts.dir);
  const configPath = resolveInside(root, "doodley.json");
  const config = await readConfig(configPath);
  if (config.sections.some((s) => s.id === id)) {
    throw new Error(`Section "${id}" already exists. Fix: choose a different id.`);
  }

  const notes: string[] = [];
  config.sections.push({ id, title });
  const beats = config.choreography?.beats;
  if (beats) {
    const factor = beats.length / (beats.length + 1);
    for (const b of beats) b.at = Math.round(b.at * factor * 10000) / 10000;
    beats.push({ id, at: 1 });
    notes.push(
      `Added a beat for "${id}" at the end and rescaled the other beats. Tracks may need keyframes for the new beat.`,
    );
  }

  const appPath = resolveInside(root, "src/App.tsx");
  let app: string | undefined;
  try {
    app = await readFile(appPath, "utf8");
  } catch {
    app = undefined;
  }
  const match = app === undefined ? null : ANCHOR.exec(app);
  if (app !== undefined && match) {
    const block = sectionBlock(match[1] ?? "", id, title, config.sections.length - 1);
    const at = match.index;
    await writeFile(appPath, `${app.slice(0, at)}${block}\n${app.slice(at)}`);
    notes.push(`Inserted a placeholder <Section id="${id}"> into src/App.tsx.`);
  } else {
    notes.push(
      `Could not find "<ambientLight" in src/App.tsx. Fix: add <Section id="${id}" title={${JSON.stringify(title)}}> with your 3D content inside <DoodleySite> yourself.`,
    );
  }
  await writeJson(configPath, config);
  return notes;
}
