import { useContext } from "react";
import { DoodleyContext } from "./context.js";
import type { BrandTokens } from "./contract.js";

export type BrandRole = "primary" | "secondary" | "surface" | "accent";

export const DEFAULT_BRAND: BrandTokens = {
  colors: {
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    background: "#111111",
    surface: "#1f2937",
    text: "#f9fafb",
    extra: {},
  },
  fonts: { heading: "system-ui", body: "system-ui" },
  spacingBase: 8,
  radiusBase: 4,
};

/** Fills every missing or empty token with its default so callers never branch on undefined. */
export function resolveBrand(brand?: Partial<BrandTokens> | null): BrandTokens {
  const d = DEFAULT_BRAND;
  const pick = (value: string | undefined, fallback: string): string => value?.trim() || fallback;
  const c = brand?.colors;
  return {
    colors: {
      primary: pick(c?.primary, d.colors.primary),
      secondary: pick(c?.secondary, d.colors.secondary),
      accent: pick(c?.accent, d.colors.accent),
      background: pick(c?.background, d.colors.background),
      surface: pick(c?.surface, d.colors.surface),
      text: pick(c?.text, d.colors.text),
      extra: c?.extra ?? {},
    },
    fonts: {
      heading: pick(brand?.fonts?.heading, d.fonts.heading),
      body: pick(brand?.fonts?.body, d.fonts.body),
    },
    spacingBase: brand?.spacingBase && brand.spacingBase > 0 ? brand.spacingBase : d.spacingBase,
    radiusBase:
      brand?.radiusBase !== undefined && brand.radiusBase >= 0 ? brand.radiusBase : d.radiusBase,
  };
}

export function useBrand(): BrandTokens {
  return resolveBrand(useContext(DoodleyContext)?.brand);
}

const GENERIC_FALLBACK = "system-ui, sans-serif";

/** CSS font-family value: the token font first, then a system fallback. */
export function fontStack(font: string): string {
  return `${font}, ${GENERIC_FALLBACK}`;
}
