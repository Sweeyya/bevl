/** Parsed brand token output — what the rest of Bevl consumes */
export interface BrandTokens {
  /** Primary palette — hex strings e.g. "#1A1A2E" */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    /** Any extra named colors */
    extra: Record<string, string>;
  };
  /** Font family names (CSS font-family value) */
  fonts: {
    heading: string;
    body: string;
  };
  /** Spacing scale base in px */
  spacingBase: number;
  /** Border radius scale base in px */
  radiusBase: number;
}

export type TokenSourceFormat = "design-md" | "design-tokens-json" | "style-dictionary";
