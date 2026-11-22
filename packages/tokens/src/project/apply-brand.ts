import { relative } from "node:path";
import { parseMd } from "../parse-md.js";
import { readTokenFile } from "../read.js";
import { readConfig, writeJson } from "./config.js";
import { projectDirOf, resolveInside } from "./inside.js";

export interface ApplyBrandOptions {
  dir: string;
  file: string;
}

export async function applyBrand(opts: ApplyBrandOptions): Promise<string[]> {
  const root = projectDirOf(opts.dir);
  const source = resolveInside(root, opts.file, "put the brand file inside the project folder");
  const tokens = await readTokenFile(source);
  const configPath = resolveInside(root, "doodley.json");
  const config = await readConfig(configPath);

  await writeJson(resolveInside(root, "src/brand.tokens.json"), tokens);
  config.brand = relative(root, source).split("\\").join("/");
  await writeJson(configPath, config);

  const defaults = parseMd("");
  const warnings: string[] = [];
  for (const k of ["primary", "secondary", "accent", "background", "surface", "text"] as const) {
    if (tokens.colors[k] === defaults.colors[k]) warnings.push(`color ${k}`);
  }
  for (const k of ["heading", "body"] as const) {
    if (tokens.fonts[k] === defaults.fonts[k]) warnings.push(`${k} font`);
  }
  const { colors, fonts } = tokens;
  const lines = [
    `Wrote src/brand.tokens.json and set brand to "${config.brand}".`,
    `Colors: primary ${colors.primary}, accent ${colors.accent}, background ${colors.background}, text ${colors.text}.`,
    `Fonts: ${fonts.heading} (headings), ${fonts.body} (body).`,
  ];
  if (warnings.length > 0) {
    lines.push(
      `Warning: the default value is in use (not found in the file) for: ${warnings.join(", ")}.`,
    );
  }
  return lines;
}
