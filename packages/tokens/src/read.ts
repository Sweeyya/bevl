/**
 * readTokenFile — read a brand/token file from disk and parse it.
 * Supports DESIGN.md and design-tokens JSON.
 */
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseJson } from "./parse-json.js";
import { parseMd } from "./parse-md.js";
import type { BrandTokens } from "./types.js";

export async function readTokenFile(filePath: string): Promise<BrandTokens> {
  const source = await readFile(filePath, "utf8");
  const ext = extname(filePath).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return parseMd(source);
  if (ext === ".json") return parseJson(source);
  // Try JSON first, fall back to markdown parsing
  try {
    return parseJson(source);
  } catch {
    return parseMd(source);
  }
}
