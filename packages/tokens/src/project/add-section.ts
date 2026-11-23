import { readFile, writeFile } from "node:fs/promises";
import { readConfig, writeJson } from "./config.js";
import { projectDirOf, resolveInside } from "./inside.js";

export interface AddSectionOptions {
  dir: string;
  id: string;
  title: string;
  after?: string;
}

const ID = /^[a-z][a-z0-9-]{0,39}$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
export const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const ANCHOR = /^(\s*)<ambientLight\b/m;

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

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  if (!slug) {
    throw new Error(
      `Cannot make a section id from "${title}". Fix: use a title with letters or numbers.`,
    );
  }
  return /^[a-z]/.test(slug) ? slug : `s-${slug}`.slice(0, 40);
}

export function sectionBlock(indent: string, id: string, title: string): string {
  return [
    `<Section id="${id}" title={${JSON.stringify(title)}}>`,
    "  <mesh>",
    "    <boxGeometry args={[2, 2, 2]} />",
    '    <meshStandardMaterial color="#8a8a8a" />',
    "  </mesh>",
    "</Section>",
  ]
    .map((l) => `${indent}${l}`)
    .join("\n");
}

function beforeLightsAt(app: string): { at: number; indent: string } | null {
  const m = ANCHOR.exec(app);
  return m && { at: m.index, indent: m[1] ?? "" };
}

function afterSectionAt(app: string, after: string): { at: number; indent: string } | null {
  const open = new RegExp(`^([ \\t]*)<Section\\b[^>]*\\bid="${after}"`, "m").exec(app);
  if (!open) return null;
  const close = app.indexOf("</Section>", open.index);
  if (close === -1) return null;
  const end = app.indexOf("\n", close);
  return { at: end === -1 ? app.length : end + 1, indent: open[1] ?? "" };
}

export async function addSection(opts: AddSectionOptions): Promise<string[]> {
  const id = validateSectionId(opts.id);
  const title = validateSectionTitle(opts.title);
  const root = projectDirOf(opts.dir);
  const configPath = resolveInside(root, "toros.json");
  const config = await readConfig(configPath);
  if (config.sections.some((s) => s.id === id)) {
    throw new Error(`Section "${id}" already exists. Fix: choose a different id.`);
  }

  const afterId = opts.after === undefined ? undefined : validateSectionId(opts.after);
  const afterIndex =
    afterId === undefined ? -1 : config.sections.findIndex((s) => s.id === afterId);
  if (afterId !== undefined && afterIndex === -1) {
    throw new Error(
      `Section "${afterId}" does not exist. Fix: use one of: ${config.sections.map((s) => s.id).join(", ")}.`,
    );
  }

  const notes: string[] = [];
  config.sections.splice(afterIndex === -1 ? config.sections.length : afterIndex + 1, 0, {
    id,
    title,
  });
  const beats = config.choreography?.beats;
  const beatIndex = afterId === undefined ? -1 : (beats?.findIndex((b) => b.id === afterId) ?? -1);
  const nextBeat = beats?.[beatIndex + 1];
  const prevBeat = beats?.[beatIndex];
  if (beats && prevBeat && nextBeat) {
    const at = Math.round(((prevBeat.at + nextBeat.at) / 2) * 10000) / 10000;
    beats.splice(beatIndex + 1, 0, { id, at });
    notes.push(
      `Added a beat for "${id}" halfway between "${afterId}" and the next beat. Tracks may need keyframes for the new beat.`,
    );
  } else if (beats) {
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
  const where =
    app === undefined
      ? null
      : afterId === undefined
        ? beforeLightsAt(app)
        : afterSectionAt(app, afterId);
  if (app !== undefined && where) {
    const block = sectionBlock(where.indent, id, title);
    await writeFile(appPath, `${app.slice(0, where.at)}${block}\n${app.slice(where.at)}`);
    notes.push(`Inserted a placeholder <Section id="${id}"> into src/App.tsx.`);
  } else {
    notes.push(
      `Could not find ${afterId === undefined ? '"<ambientLight"' : `<Section id="${afterId}">`} in src/App.tsx. Fix: add <Section id="${id}" title={${JSON.stringify(title)}}> with your 3D content inside <TorosSite> yourself.`,
    );
  }
  await writeJson(configPath, config);
  return notes;
}
