import { mkdir } from "node:fs/promises";
import { applyBrand } from "../project/apply-brand.js";
import { writeJson } from "../project/config.js";
import { projectDirOf, resolveInside } from "../project/inside.js";
import type { BrandTokens } from "../types.js";
import { type Brief, writeBrief } from "./brief.js";
import { dealDirection } from "./deal.js";
import type { ArtDirection } from "./directions.js";

export const DIRECTION_TOKENS_FILE = "brand/direction.tokens.json";

export function directionToTokens(d: ArtDirection): BrandTokens {
  return {
    colors: { ...d.palette, extra: {} },
    fonts: { ...d.fonts },
    spacingBase: 8,
    radiusBase: 0,
  };
}

export interface ApplyDirectionOptions {
  dir: string;
  brief: Brief;
  direction: ArtDirection;
}

export async function applyDirection(opts: ApplyDirectionOptions): Promise<string[]> {
  const root = projectDirOf(opts.dir);
  const { colors, fonts } = directionToTokens(opts.direction);
  const target = resolveInside(root, DIRECTION_TOKENS_FILE);
  await mkdir(resolveInside(root, "brand"), { recursive: true });
  await writeJson(target, {
    colors: Object.fromEntries(
      Object.entries(colors)
        .filter(([k]) => k !== "extra")
        .map(([k, v]) => [k, { $value: v, $type: "color" }]),
    ),
    fonts: {
      heading: { $value: fonts.heading, $type: "fontFamily" },
      body: { $value: fonts.body, $type: "fontFamily" },
    },
  });
  const lines = await applyBrand({ dir: root, file: target });
  const history = [...new Set([...(opts.brief.history ?? []), opts.direction.id])];
  await writeBrief(root, { ...opts.brief, direction: opts.direction.id, history });
  return [`Applied art direction "${opts.direction.name}" (${opts.direction.id}).`, ...lines];
}

export interface DealResult {
  direction: ArtDirection;
  notes: string[];
}

/** Deals a direction for the brief; with `dir` it also writes the tokens and updates toros.brief.json. */
export async function dealForBrief(opts: {
  brief: Brief;
  seed: number;
  dir?: string | undefined;
}): Promise<DealResult> {
  const direction = dealDirection(opts.brief, { seed: opts.seed });
  const notes =
    opts.dir === undefined
      ? []
      : await applyDirection({ dir: opts.dir, brief: opts.brief, direction });
  return { direction, notes };
}
