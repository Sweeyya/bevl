import { readConfig, writeJson } from "./config.js";
import { projectDirOf, resolveInside } from "./inside.js";

export interface ApplyChoreographyOptions {
  dir: string;
  build: (sectionIds: string[]) => unknown;
}

/** Replace "choreography" in toros.json with whatever `build` returns for the project's section ids. */
export async function applyChoreography(opts: ApplyChoreographyOptions): Promise<string[]> {
  const configPath = resolveInside(projectDirOf(opts.dir), "toros.json");
  const config = await readConfig(configPath);
  const ids = config.sections.map((s) => s.id);
  await writeJson(configPath, { ...config, choreography: opts.build(ids) });
  return [`Wrote choreography for ${ids.length} sections to toros.json.`];
}
