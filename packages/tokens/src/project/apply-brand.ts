import { readFile } from "node:fs/promises";
import { extname, relative } from "node:path";
import { hasFontInfo } from "../fonts.js";
import { parseMd } from "../parse-md.js";
import { readTokenFile } from "../read.js";
import { readConfig, writeJson } from "./config.js";
import { projectDirOf, resolveInside } from "./inside.js";

export interface ApplyBrandOptions {
  dir: string;
  file: string;
}

const FONT_FORMATS =
  '- Headings: Georgia, serif\n- Body: Inter, sans-serif   (or "Heading font: X", "Body font: X", `font-family: X, serif;`; token JSON: font.heading / font.body as { "$value": "X, serif" })';

export function brandFileHint(file: string): string {
  const name = extname(file).toLowerCase() === ".json" ? "brand.tokens.json" : "DESIGN.md";
  return `copy it into the project, for example: cp "${file}" ./${name} (accepted formats: .md or .json), then pass ./${name}`;
}

export async function applyBrand(opts: ApplyBrandOptions): Promise<string[]> {
  const root = projectDirOf(opts.dir);
  const source = resolveInside(root, opts.file, brandFileHint(opts.file));
  const tokens = await readTokenFile(source);
  const configPath = resolveInside(root, "toros.json");
  const config = await readConfig(configPath);

  const defaults = parseMd("");
  const noFonts = (["heading", "body"] as const).every(
    (k) => tokens.fonts[k] === defaults.fonts[k],
  );
  if (
    noFonts &&
    hasFontInfo(await readFile(source, "utf8"), extname(source).toLowerCase() === ".json")
  ) {
    throw new Error(
      `${opts.file} has a typography section but no font could be read from it. Fix: write fonts like:\n${FONT_FORMATS}`,
    );
  }

  await writeJson(resolveInside(root, "src/brand.tokens.json"), tokens);
  config.brand = relative(root, source).split("\\").join("/");
  await writeJson(configPath, config);

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
