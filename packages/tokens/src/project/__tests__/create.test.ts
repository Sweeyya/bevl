import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createSite, escapeHtml, validateSiteName } from "../create.js";

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "doodley-create-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("validateSiteName", () => {
  it("accepts ordinary names", () => {
    for (const n of ["my-site", "Spectr 3D", "a", "site_2"]) expect(validateSiteName(n)).toBe(n);
  });
  it("rejects path tricks, markup and empty names", () => {
    for (const n of [
      "../x",
      "a/b",
      "a\\b",
      "..",
      ".hidden",
      "<script>",
      'a"b',
      "",
      "x".repeat(65),
      "a\nb",
    ]) {
      expect(() => validateSiteName(n)).toThrow(/Fix:/);
    }
  });
});

describe("escapeHtml", () => {
  it("escapes the characters that break out of HTML text and attributes", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("createSite", () => {
  it("writes the project inside the parent folder", async () => {
    const dir = tmp();
    await createSite({ name: "demo", dir });
    expect(existsSync(join(dir, "demo", "doodley.json"))).toBe(true);
    expect(readFileSync(join(dir, "demo", "index.html"), "utf8")).toContain("<title>demo</title>");
  });
  it("refuses a name that would escape the parent folder", async () => {
    const dir = tmp();
    await expect(createSite({ name: "../escape", dir })).rejects.toThrow(/Invalid site name/);
    expect(existsSync(join(dir, "..", "escape"))).toBe(false);
  });
});

describe("createSite scaffold", () => {
  it("wires brand tokens, the a11y overlay and a package.json", async () => {
    const dir = tmp();
    await createSite({ name: "Spectr 3D", dir });
    const site = join(dir, "Spectr 3D");
    const app = readFileSync(join(site, "src", "App.tsx"), "utf8");
    expect(app).toContain('import brand from "./brand.tokens.json"');
    expect(app).toContain("brand={brand}");
    expect(app).toContain("overlay={<DoodleyA11y");
    expect(JSON.parse(readFileSync(join(site, "src", "brand.tokens.json"), "utf8"))).toHaveProperty(
      "colors.primary",
    );
    expect(JSON.parse(readFileSync(join(site, "package.json"), "utf8")).name).toBe("spectr-3d");
    expect(readFileSync(join(site, "index.html"), "utf8")).toContain('name="description"');
  });
  it("refuses to overwrite an existing site", async () => {
    const dir = tmp();
    await createSite({ name: "demo", dir });
    await expect(createSite({ name: "demo", dir })).rejects.toThrow(/already exists/);
  });
});
