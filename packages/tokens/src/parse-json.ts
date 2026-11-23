/**
 * Parse a W3C Design Tokens (design-tokens-json) or Style Dictionary JSON file.
 * Both formats store tokens as nested objects with a $value or value key.
 */
import { DEFAULT_FONT, fontStack } from "./fonts.js";
import type { BrandTokens } from "./types.js";

type TokenNode =
  | { $value?: unknown; value?: unknown; $type?: string; type?: string }
  | Record<string, unknown>;

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX_RE.test(v);
}

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
}

/** Flatten nested token tree into key → value pairs */
function flatten(obj: Record<string, unknown>, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const node = v as TokenNode;
      const val = node.$value ?? node.value;
      if (val !== undefined) {
        out.set(key, val);
      } else {
        for (const [ck, cv] of flatten(v as Record<string, unknown>, key)) {
          out.set(ck, cv);
        }
      }
    }
  }
  return out;
}

const ROLE_KEYWORDS: Array<[keyof Omit<BrandTokens["colors"], "extra">, string[]]> = [
  ["primary", ["primary"]],
  ["secondary", ["secondary"]],
  ["accent", ["accent", "highlight", "cta"]],
  ["background", ["background", "bg", "base"]],
  ["surface", ["surface", "card", "panel"]],
  ["text", ["text", "foreground", "fg", "on-"]],
];

const FONT_KEYWORDS: Array<[keyof BrandTokens["fonts"], string[]]> = [
  ["heading", ["heading", "display", "title", "h1", "h2"]],
  ["body", ["body", "paragraph", "text", "base", "default"]],
];

const FONT_KEY = /font|typeface|family/;
const NOT_FAMILY = /size|weight|height|spacing|style|leading|tracking/;

export function parseJson(source: string): BrandTokens {
  const colors: BrandTokens["colors"] = {
    primary: "#000000",
    secondary: "#333333",
    accent: "#0066ff",
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#111111",
    extra: {},
  };
  const fonts: BrandTokens["fonts"] = { heading: DEFAULT_FONT, body: DEFAULT_FONT };
  let spacingBase = 8;
  let radiusBase = 4;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(source) as Record<string, unknown>;
  } catch {
    return { colors, fonts, spacingBase, radiusBase };
  }

  const tokens = flatten(parsed);

  for (const [key, val] of tokens) {
    const lower = key.toLowerCase();

    if (isHex(val)) {
      const hex = normalizeHex(val);
      let assigned = false;
      for (const [role, keywords] of ROLE_KEYWORDS) {
        if (keywords.some((kw) => lower.includes(kw))) {
          if (colors[role] === defaultFor(role)) {
            colors[role] = hex;
            assigned = true;
            break;
          }
        }
      }
      if (!assigned) {
        const shortKey = key.split(".").pop() ?? key;
        colors.extra[shortKey] = hex;
      }
    }

    const stack = FONT_KEY.test(lower) && !NOT_FAMILY.test(lower) ? fontStack(val) : null;
    if (stack && !isHex(val)) {
      for (const [role, keywords] of FONT_KEYWORDS) {
        if (keywords.some((kw) => lower.includes(kw))) {
          fonts[role] = stack;
          break;
        }
      }
    }

    if (typeof val === "number") {
      if (lower.includes("spacing") || lower.includes("space")) spacingBase = val;
      if (lower.includes("radius") || lower.includes("rounded")) radiusBase = val;
    }
  }

  return { colors, fonts, spacingBase, radiusBase };
}

function defaultFor(role: keyof Omit<BrandTokens["colors"], "extra">): string {
  const defaults = {
    primary: "#000000",
    secondary: "#333333",
    accent: "#0066ff",
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#111111",
  };
  return defaults[role];
}
