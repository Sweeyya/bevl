import type { BrandTokens } from "@toros/core";

export const brands: Record<string, BrandTokens> = {
  dark: {
    colors: {
      primary: "#2ec4b6",
      secondary: "#ff6b6b",
      accent: "#ffd166",
      background: "#070d14",
      surface: "#14222e",
      text: "#eef6f6",
      extra: {},
    },
    fonts: { heading: "Futura", body: "Gill Sans" },
    spacingBase: 8,
    radiusBase: 0,
  },
  light: {
    colors: {
      primary: "#e4572e",
      secondary: "#2e86ab",
      accent: "#f2a900",
      background: "#e6edf4",
      surface: "#fbfcfe",
      text: "#14202b",
      extra: {},
    },
    fonts: { heading: "Rockwell", body: "Verdana" },
    spacingBase: 8,
    radiusBase: 0,
  },
};
