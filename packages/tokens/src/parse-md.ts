/**
 * Parse a DESIGN.md file into BrandTokens.
 * Looks for color, font, spacing, and radius values in markdown.
 */
import { DEFAULT_FONT, parseFonts } from "./fonts.js";
import type { BrandTokens } from "./types.js";

const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const SPACING_RE = /spacing[:\s]+(\d+(?:\.\d+)?)\s*px/i;
const RADIUS_RE = /radius[:\s]+(\d+(?:\.\d+)?)\s*px/i;

const COLOR_ROLES = ["primary", "secondary", "accent", "background", "surface", "text"] as const;

function nearestRole(context: string): (typeof COLOR_ROLES)[number] | null {
  const lower = context.toLowerCase();
  for (const role of COLOR_ROLES) {
    if (lower.includes(role)) return role;
  }
  return null;
}

export function parseMd(source: string): BrandTokens {
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
  let radiusBase = 0;

  // Extract colors — scan each line for hex values, use surrounding text as role hint
  for (const line of source.split("\n")) {
    const matches = [...line.matchAll(HEX_RE)];
    if (matches.length === 0) continue;
    const role = nearestRole(line);
    for (const m of matches) {
      const hex = normalizeHex(m[0]);
      if (role && colors[role] === defaultFor(role)) {
        colors[role] = hex;
      } else {
        // Store under a sanitized key derived from surrounding text
        const key =
          line
            .replace(HEX_RE, "")
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 32)
            .toLowerCase() || `color-${Object.keys(colors.extra).length}`;
        colors.extra[key] = hex;
      }
    }
  }

  Object.assign(fonts, parseFonts(source));

  // Extract spacing and radius
  const spacingMatch = source.match(SPACING_RE);
  if (spacingMatch?.[1]) spacingBase = Number(spacingMatch[1]);
  const radiusMatch = source.match(RADIUS_RE);
  if (radiusMatch?.[1]) radiusBase = Number(radiusMatch[1]);

  return { colors, fonts, spacingBase, radiusBase };
}

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

function defaultFor(role: (typeof COLOR_ROLES)[number]): string {
  const defaults: Record<(typeof COLOR_ROLES)[number], string> = {
    primary: "#000000",
    secondary: "#333333",
    accent: "#0066ff",
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#111111",
  };
  return defaults[role];
}
