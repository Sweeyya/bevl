import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { contactSheet, formatShots, shotFileName, withTestMode } from "../shots.js";

describe("shotFileName", () => {
  it("numbers from 01 and slugs the section id", () => {
    expect(shotFileName("desktop", 0, "welcome")).toBe("desktop-01-welcome.png");
    expect(shotFileName("phone", 11, "Our Beans!")).toBe("phone-12-our-beans.png");
    expect(shotFileName("phone", 1, "***")).toBe("phone-02-screen.png");
  });
});

describe("withTestMode", () => {
  it("adds the parameter to a URL with no query", () => {
    expect(withTestMode("http://localhost:3000/")).toBe("http://localhost:3000/?toros-test=");
  });
  it("keeps an existing query string", () => {
    expect(withTestMode("http://localhost:3000/?fixture=snap")).toBe(
      "http://localhost:3000/?fixture=snap&toros-test=",
    );
  });
  it("does not add it twice", () => {
    expect(withTestMode("http://localhost:3000/?toros-test")).toBe(
      "http://localhost:3000/?toros-test=",
    );
  });
});

describe("formatShots", () => {
  it("lists every file and the manifest", () => {
    const out = formatShots({
      url: "u",
      outDir: "/o",
      files: [
        {
          file: "desktop-01-a.png",
          viewport: "desktop",
          beat: 0,
          section: "a",
          title: "A",
          progress: 0,
        },
      ],
      contactSheets: ["desktop-contact-sheet.png"],
    });
    expect(out).toContain("desktop 1. A (0.000)  /o/desktop-01-a.png");
    expect(out).toContain("/o/manifest.json");
  });
});

describe("contactSheet", () => {
  it("lays thumbnails out in a grid", () => {
    const img = new PNG({ width: 100, height: 50 });
    img.data.fill(255);
    const png = PNG.sync.write(img);
    const sheet = PNG.sync.read(contactSheet([png, png, png], 20, 2));
    expect(sheet.width).toBe(8 + 2 * 28);
    expect(sheet.height).toBe(8 + 2 * (10 + 8));
  });
});
