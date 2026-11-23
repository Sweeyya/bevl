import { describe, expect, it } from "vitest";
import { VERSION } from "../index.js";
import { parseJson } from "../parse-json.js";
import { parseMd } from "../parse-md.js";

describe("@toros/tokens", () => {
  it("exports a version string", () => {
    expect(VERSION).toBe("0.1.0");
  });
});

describe("parseMd", () => {
  it("extracts primary color from a line containing 'primary'", () => {
    const md = `# Brand\nprimary: #1A1A2E\nsecondary: #E94560\n`;
    const tokens = parseMd(md);
    expect(tokens.colors.primary).toBe("#1a1a2e");
    expect(tokens.colors.secondary).toBe("#e94560");
  });

  it("expands 3-digit hex", () => {
    const md = `primary: #abc\n`;
    const tokens = parseMd(md);
    expect(tokens.colors.primary).toBe("#aabbcc");
  });

  it("extracts heading font", () => {
    const md = `font-family: "Sora"\n`;
    const tokens = parseMd(md);
    expect(tokens.fonts.heading).toBe("Sora");
  });

  it("returns safe defaults when nothing matches", () => {
    const tokens = parseMd("# Empty brand file\n");
    expect(tokens.colors.primary).toBe("#000000");
    expect(tokens.fonts.heading).toBe("sans-serif");
    expect(tokens.spacingBase).toBe(8);
    expect(tokens.radiusBase).toBe(4);
  });
});

describe("parseJson", () => {
  it("parses W3C design-tokens-json format", () => {
    const json = JSON.stringify({
      color: {
        primary: { $value: "#FF5733", $type: "color" },
        background: { $value: "#FFFFFF", $type: "color" },
      },
      font: {
        heading: { $value: "Inter", $type: "fontFamily" },
        body: { $value: "Roboto", $type: "fontFamily" },
      },
    });
    const tokens = parseJson(json);
    expect(tokens.colors.primary).toBe("#ff5733");
    expect(tokens.colors.background).toBe("#ffffff");
    expect(tokens.fonts.heading).toBe("Inter");
    expect(tokens.fonts.body).toBe("Roboto");
  });

  it("parses Style Dictionary format", () => {
    const json = JSON.stringify({
      color: {
        brand: {
          primary: { value: "#6200EE" },
          secondary: { value: "#03DAC6" },
        },
      },
    });
    const tokens = parseJson(json);
    expect(tokens.colors.primary).toBe("#6200ee");
    expect(tokens.colors.secondary).toBe("#03dac6");
  });

  it("returns safe defaults for invalid JSON", () => {
    const tokens = parseJson("not json at all");
    expect(tokens.colors.primary).toBe("#000000");
  });
});
