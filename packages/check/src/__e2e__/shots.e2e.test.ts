import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { captureShots, type ShotsManifest } from "../shots.js";

const dir = mkdtempSync(join(tmpdir(), "toros-shots-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const url = () => `${inject("baseUrl")}/?fixture=tracks`;

describe("captureShots", () => {
  let first: ShotsManifest;
  beforeAll(async () => {
    first = await captureShots({ url: url(), projectDir: dir, outDir: join(dir, "a") });
  }, 120_000);

  it("saves one valid PNG per beat per viewport, a manifest and contact sheets", () => {
    expect(first.files).toHaveLength(6);
    expect(first.files.filter((f) => f.viewport === "phone")).toHaveLength(3);
    for (const f of first.files) {
      const png = PNG.sync.read(readFileSync(join(first.outDir, f.file)));
      expect(png.width).toBeGreaterThan(300);
    }
    expect(readdirSync(first.outDir).sort()).toEqual(
      [
        ...first.files.map((f) => f.file),
        "desktop-contact-sheet.png",
        "phone-contact-sheet.png",
        "manifest.json",
      ].sort(),
    );
    const manifest = JSON.parse(readFileSync(join(first.outDir, "manifest.json"), "utf8"));
    expect(manifest.files).toEqual(first.files);
  });

  it("shows different pictures on different beats", () => {
    const hashes = first.files
      .filter((f) => f.viewport === "desktop")
      .map((f) => hash(join(first.outDir, f.file)));
    expect(new Set(hashes).size).toBeGreaterThanOrEqual(2);
  });

  it("gives identical files on a second run, and works with an existing query string", async () => {
    const second = await captureShots({
      url: `${url()}&x=1`,
      projectDir: dir,
      outDir: join(dir, "b"),
      viewport: "desktop",
    });
    for (const f of second.files)
      expect(hash(join(second.outDir, f.file))).toBe(hash(join(first.outDir, f.file)));
  });

  it("fails with a Fix when the page cannot be opened", async () => {
    await expect(
      captureShots({ url: "http://127.0.0.1:1/", projectDir: dir, outDir: join(dir, "c") }),
    ).rejects.toThrow(/Fix:/);
  });
});
