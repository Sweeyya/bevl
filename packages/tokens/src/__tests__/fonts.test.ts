import { describe, expect, it } from "vitest";
import { parseJson } from "../parse-json.js";
import { parseMd } from "../parse-md.js";

const fonts = (md: string) => parseMd(md).fonts;

describe("brand fonts in DESIGN.md", () => {
  it("reads Headings/Body lines under Typography with fallbacks", () => {
    expect(
      fonts("## Typography\n\n- Headings: Georgia, serif\n- Body: Inter, sans-serif\n"),
    ).toEqual({
      heading: "Georgia, serif",
      body: "Inter, sans-serif",
    });
  });
  it("never lets a capture run across lines", () => {
    const f = fonts("- Heading font: Georgia\n- Body font: Inter\n");
    expect(f).toEqual({ heading: "Georgia", body: "Inter" });
  });
  it("reads Display and bold labels", () => {
    expect(
      fonts('## Fonts\n**Display:** Sora, sans-serif\n**Body:** "DM Sans", sans-serif\n'),
    ).toEqual({
      heading: "Sora, sans-serif",
      body: "DM Sans, sans-serif",
    });
  });
  it("reads CSS font-family lines in order", () => {
    expect(
      fonts(
        "h1 { font-family: 'Fraunces', serif; }\nbody {\n  font-family: Inter, sans-serif;\n}\n",
      ),
    ).toEqual({
      heading: "Fraunces, serif",
      body: "Inter, sans-serif",
    });
  });
  it("uses one font for both when only one is given", () => {
    expect(fonts('font-family: "Sora"\n')).toEqual({ heading: "Sora", body: "Sora" });
  });
  it("ignores Body: outside a typography section", () => {
    expect(fonts("## Voice\n- Body: friendly and warm\n").body).toBe("sans-serif");
  });
  it("keeps defaults when no font is present", () => {
    expect(fonts("# Brand\n- primary: #112233\n")).toEqual({
      heading: "sans-serif",
      body: "sans-serif",
    });
  });
});

describe("brand fonts in token JSON", () => {
  it("keeps fallbacks from strings and arrays and ignores sizes", () => {
    const t = parseJson(
      JSON.stringify({
        font: {
          heading: { $value: "Georgia, serif" },
          body: { $value: ["Inter", "sans-serif"] },
          size: { body: { $value: "16px" } },
        },
      }),
    );
    expect(t.fonts).toEqual({ heading: "Georgia, serif", body: "Inter, sans-serif" });
  });
});
