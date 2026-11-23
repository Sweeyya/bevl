import type { BrandTokens } from "./types.js";

export const DEFAULT_FONT = "sans-serif";

const FAMILY = /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/;
const LINE = /^[\s>*+-]*\**\s*([A-Za-z][A-Za-z -]{0,30}?)\s*\**\s*[:=]\s*(.+)$/;
const SECTION = /^#{1,6}\s.*(typograph|font)/i;
const HEADING_WORD = /head|display|title/i;
const BODY_WORD = /body|text|paragraph/i;

/** "Georgia, serif" or ["Georgia", "serif"] to a clean "Georgia, serif"; null when it is not a font list. */
export function fontStack(value: unknown): string | null {
  const raw = Array.isArray(value) ? value.join(",") : value;
  if (typeof raw !== "string") return null;
  const families = raw
    .replace(/\([^)]*\)/g, "")
    .replace(/!important|[;`*]/g, "")
    .replace(/\.\s*$/, "")
    .split(",")
    .map((f) => f.trim().replace(/^["']|["']$/g, ""));
  const valid = families.filter((f) => FAMILY.test(f));
  return valid.length > 0 && valid.length === families.length ? valid.join(", ") : null;
}

export function parseFonts(source: string): Partial<BrandTokens["fonts"]> {
  const found: Partial<BrandTokens["fonts"]> = {};
  const generic: string[] = [];
  let inSection = false;
  for (const line of source.split("\n")) {
    if (/^#{1,6}\s/.test(line)) inSection = SECTION.test(line);
    const m = LINE.exec(line.replace(/^[^:{]*\{\s*/, "").replace(/\s*\}\s*$/, ""));
    const label = m?.[1]?.trim();
    const stack = fontStack(m?.[2]);
    if (!label || !stack) continue;
    const named = /font|typeface/i.test(label);
    if (!named && !inSection) continue;
    if (HEADING_WORD.test(label)) found.heading ??= stack;
    else if (BODY_WORD.test(label)) found.body ??= stack;
    else if (named) generic.push(stack);
  }
  const [first, second] = generic;
  const heading = found.heading ?? first;
  const body = found.body ?? second ?? (found.heading ? undefined : first);
  return { ...(heading && { heading }), ...(body && { body }) };
}

const JSON_FONT_KEY = /"[^"]*(font|typograph|typeface)[^"]*"\s*:/i;
const MD_FONT_INFO = /^#{1,6}\s.*(typograph|font)|font(-family)?\s*[:=]/im;

export function hasFontInfo(source: string, json: boolean): boolean {
  return (json ? JSON_FONT_KEY : MD_FONT_INFO).test(source);
}
