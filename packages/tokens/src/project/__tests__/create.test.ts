import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createSite, escapeHtml, validateSiteName } from "../create.js";

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "toros-create-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("validateSiteName", () => {
  it("accepts ordinary names", () => {
    for (const n of ["my-site", "Coffee 3D", "a", "site_2"]) expect(validateSiteName(n)).toBe(n);
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
    expect(existsSync(join(dir, "demo", "toros.json"))).toBe(true);
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
    await createSite({ name: "Coffee 3D", dir });
    const site = join(dir, "Coffee 3D");
    const app = readFileSync(join(site, "src", "App.tsx"), "utf8");
    expect(app).toContain('import brand from "./brand.tokens.json"');
    expect(app).toContain("brand={brand}");
    expect(app).toContain("overlay={<TorosA11y");
    expect(JSON.parse(readFileSync(join(site, "src", "brand.tokens.json"), "utf8"))).toHaveProperty(
      "colors.primary",
    );
    expect(JSON.parse(readFileSync(join(site, "package.json"), "utf8")).name).toBe("coffee-3d");
    expect(readFileSync(join(site, "index.html"), "utf8")).toContain('name="description"');
  });
  it("refuses to overwrite an existing site", async () => {
    const dir = tmp();
    await createSite({ name: "demo", dir });
    await expect(createSite({ name: "demo", dir })).rejects.toThrow(/already exists/);
  });
});

describe("createSite sections, description and install", () => {
  const sectionsOf = (site: string) =>
    JSON.parse(readFileSync(join(site, "toros.json"), "utf8")).sections;
  it("writes exactly the given sections in order and no template leftovers", async () => {
    const dir = tmp();
    const notes = await createSite({
      name: "cafe",
      dir,
      sections: ["Welcome", "Our Beans", "Visit Us", "Contact"],
    });
    expect(sectionsOf(join(dir, "cafe")).map((s: { id: string }) => s.id)).toEqual([
      "welcome",
      "our-beans",
      "visit-us",
      "contact",
    ]);
    const app = readFileSync(join(dir, "cafe", "src", "App.tsx"), "utf8");
    expect([...app.matchAll(/<Section id="([^"]+)"/g)].map((m) => m[1])).toEqual([
      "welcome",
      "our-beans",
      "visit-us",
      "contact",
    ]);
    for (const old of ["hero", "features", "#e94560", "#0f3460"]) expect(app).not.toContain(old);
    expect(app).toContain("<ambientLight");
    expect(notes.join(" ")).toMatch(/not published/);
  });
  it("makes ids unique and valid", async () => {
    const dir = tmp();
    await createSite({ name: "u", dir, sections: ["About", "about", "2024 Menu"] });
    expect(sectionsOf(join(dir, "u")).map((s: { id: string }) => s.id)).toEqual([
      "about",
      "about-2",
      "s-2024-menu",
    ]);
    await expect(createSite({ name: "bad", dir, sections: ["!!!"] })).rejects.toThrow(/Fix:/);
    await expect(createSite({ name: "none", dir, sections: [] })).rejects.toThrow(/Fix:/);
  });
  it("defaults to hero, features, contact", async () => {
    const dir = tmp();
    await createSite({ name: "d", dir });
    expect(sectionsOf(join(dir, "d")).map((s: { id: string }) => s.id)).toEqual([
      "hero",
      "features",
      "contact",
    ]);
  });
  it("writes a title and a real description, escaped", async () => {
    const dir = tmp();
    await createSite({ name: "Fern", dir });
    await createSite({ name: "Fern2", dir, description: 'Small "batch" <coffee>' });
    const a = readFileSync(join(dir, "Fern", "index.html"), "utf8");
    expect(a).toContain("<title>Fern</title>");
    expect(a).toContain('content="Fern: an interactive 3D scroll experience."');
    expect(a).not.toContain("built with Toros");
    expect(readFileSync(join(dir, "Fern2", "index.html"), "utf8")).toContain(
      'content="Small &quot;batch&quot; &lt;coffee&gt;"',
    );
    await expect(createSite({ name: "x", dir, description: "a\nb" })).rejects.toThrow(/Fix:/);
  });
  it("uses workspace:* inside a matching pnpm workspace and says nothing", async () => {
    const root = tmp();
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      'packages:\n  - "packages/*"\n  - examples/*\n',
    );
    mkdirSync(join(root, "examples"));
    const notes = await createSite({ name: "w", dir: join(root, "examples") });
    const pkg = JSON.parse(readFileSync(join(root, "examples", "w", "package.json"), "utf8"));
    expect(pkg.dependencies["@toros/core"]).toBe("workspace:*");
    expect(pkg.dependencies["@toros/a11y"]).toBe("workspace:*");
    expect(notes).toEqual([]);
  });
  it("uses the version and prints a note when the workspace globs do not match", async () => {
    const root = tmp();
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n  - '!examples/*'\n",
    );
    mkdirSync(join(root, "examples"));
    const notes = await createSite({ name: "w", dir: join(root, "examples") });
    const pkg = JSON.parse(readFileSync(join(root, "examples", "w", "package.json"), "utf8"));
    expect(pkg.dependencies["@toros/core"]).toBe("0.1.0");
    expect(notes[0]).toMatch(/link:/);
  });
});
