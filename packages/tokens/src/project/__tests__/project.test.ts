import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { addSection } from "../add-section.js";
import { applyBrand } from "../apply-brand.js";
import { createSite } from "../create.js";

const bases: string[] = [];
async function site(config?: object | string) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "toros-proj-")));
  bases.push(base);
  await createSite({ name: "s", dir: base });
  const dir = join(base, "s");
  if (config !== undefined) {
    writeFileSync(
      join(dir, "toros.json"),
      typeof config === "string" ? config : JSON.stringify(config),
    );
  }
  return { base, dir };
}
afterAll(() => {
  for (const b of bases) rmSync(b, { recursive: true, force: true });
});
const read = (p: string) => readFileSync(p, "utf8");

describe("addSection", () => {
  it("appends to toros.json and inserts a section before ambientLight", async () => {
    const { dir } = await site();
    await addSection({ dir, id: "pricing", title: "Pricing" });
    const cfg = JSON.parse(read(join(dir, "toros.json")));
    expect(cfg.sections.at(-1)).toEqual({ id: "pricing", title: "Pricing" });
    const app = read(join(dir, "src/App.tsx"));
    expect(app.indexOf('id="pricing"')).toBeLessThan(app.indexOf("<ambientLight"));
    expect(app).toContain('title={"Pricing"}');
  });
  it("escapes titles so they cannot break the JSX", async () => {
    const { dir } = await site();
    await addSection({ dir, id: "x", title: `</Section><script>"'{}` });
    const app = read(join(dir, "src/App.tsx"));
    expect(app).toContain(`title={"</Section><script>\\"'{}"}`);
  });
  it("refuses duplicates and leaves files untouched", async () => {
    const { dir } = await site();
    const before = read(join(dir, "toros.json"));
    await expect(addSection({ dir, id: "hero", title: "Again" })).rejects.toThrow(/already exists/);
    expect(read(join(dir, "toros.json"))).toBe(before);
  });
  it("rejects bad ids and titles", async () => {
    const { dir } = await site();
    for (const id of ["../x", "<script>", 'a"b', "A", "1a", "", "a".repeat(41), "a b"]) {
      await expect(addSection({ dir, id, title: "T" })).rejects.toThrow(/Invalid section id/);
    }
    for (const title of ["", "x".repeat(81), "a\nb", "a\u0000b"]) {
      await expect(addSection({ dir, id: "ok", title })).rejects.toThrow(/Invalid section title/);
    }
  });
  it("rescales beats, keeps order and adds a note", async () => {
    const { dir } = await site({
      name: "s",
      sections: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
      ],
      choreography: {
        beats: [
          { id: "a", at: 0 },
          { id: "b", at: 0.5 },
          { id: "c", at: 1 },
        ],
      },
    });
    const notes = await addSection({ dir, id: "d", title: "D" });
    const beats = JSON.parse(read(join(dir, "toros.json"))).choreography.beats;
    expect(beats.map((b: { id: string }) => b.id)).toEqual(["a", "b", "c", "d"]);
    expect(beats.map((b: { at: number }) => b.at)).toEqual([0, 0.375, 0.75, 1]);
    expect(notes.join(" ")).toMatch(/keyframes/);
  });
  it("prints manual instructions when App.tsx has no anchor", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "src/App.tsx"), "export default () => null;\n");
    const notes = await addSection({ dir, id: "z", title: "Z" });
    expect(read(join(dir, "src/App.tsx"))).toBe("export default () => null;\n");
    expect(notes.join(" ")).toContain('<Section id="z"');
  });
  it("works when App.tsx is missing", async () => {
    const { dir } = await site();
    rmSync(join(dir, "src/App.tsx"));
    expect((await addSection({ dir, id: "z", title: "Z" })).join(" ")).toMatch(/Could not find/);
  });
  it("rejects malformed toros.json and non-projects", async () => {
    const bad = await site("{nope");
    await expect(addSection({ dir: bad.dir, id: "z", title: "Z" })).rejects.toThrow(
      /not valid JSON/,
    );
    const shape = await site({ sections: "x" });
    await expect(addSection({ dir: shape.dir, id: "z", title: "Z" })).rejects.toThrow(/sections/);
    const beats = await site({ sections: [], choreography: { beats: 3 } });
    await expect(addSection({ dir: beats.dir, id: "z", title: "Z" })).rejects.toThrow(/beats/);
    await expect(addSection({ dir: bad.base, id: "z", title: "Z" })).rejects.toThrow(
      /No toros.json/,
    );
  });
  it("will not write through a symlink that leaves the project", async () => {
    const { base, dir } = await site();
    const outside = join(base, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "App.tsx"), "<ambientLight />");
    rmSync(join(dir, "src"), { recursive: true });
    symlinkSync(outside, join(dir, "src"));
    await expect(addSection({ dir, id: "z", title: "Z" })).rejects.toThrow(/outside the project/);
    expect(read(join(outside, "App.tsx"))).toBe("<ambientLight />");
  });
});

describe("addSection --after", () => {
  it("inserts after the given section in toros.json and App.tsx", async () => {
    const { dir } = await site();
    await addSection({ dir, id: "menu", title: "Menu", after: "hero" });
    const ids = JSON.parse(read(join(dir, "toros.json"))).sections.map((s: { id: string }) => s.id);
    expect(ids).toEqual(["hero", "menu", "features", "contact"]);
    const app = read(join(dir, "src/App.tsx"));
    expect(app.indexOf('id="hero"')).toBeLessThan(app.indexOf('id="menu"'));
    expect(app.indexOf('id="menu"')).toBeLessThan(app.indexOf('id="features"'));
  });
  it("can insert after the last section and rejects unknown ids", async () => {
    const { dir } = await site();
    await addSection({ dir, id: "end", title: "End", after: "contact" });
    const app = read(join(dir, "src/App.tsx"));
    expect(app.indexOf('id="contact"')).toBeLessThan(app.indexOf('id="end"'));
    expect(app.indexOf('id="end"')).toBeLessThan(app.indexOf("<ambientLight"));
    await expect(addSection({ dir, id: "x", title: "X", after: "nope" })).rejects.toThrow(
      /does not exist/,
    );
  });
  it("places the new beat between neighbours", async () => {
    const { dir } = await site({
      name: "s",
      sections: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      choreography: {
        beats: [
          { id: "a", at: 0 },
          { id: "b", at: 1 },
        ],
      },
    });
    await addSection({ dir, id: "m", title: "M", after: "a" });
    const beats = JSON.parse(read(join(dir, "toros.json"))).choreography.beats;
    expect(beats).toEqual([
      { id: "a", at: 0 },
      { id: "m", at: 0.5 },
      { id: "b", at: 1 },
    ]);
  });
});

describe("applyBrand", () => {
  it("fails with accepted formats when a typography section has no readable font", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "DESIGN.md"), "## Typography\n\nWe like friendly letters.\n");
    await expect(applyBrand({ dir, file: "DESIGN.md" })).rejects.toThrow(
      /Fix:[\s\S]*Headings: Georgia, serif/,
    );
  });
  it("only warns when the file has no font information at all", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "DESIGN.md"), "- primary: #112233\n");
    expect((await applyBrand({ dir, file: "DESIGN.md" })).join("\n")).toMatch(/Warning/);
  });
  it("fails for token JSON with font keys but no readable font", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "t.json"), JSON.stringify({ font: { size: { $value: "16px" } } }));
    await expect(applyBrand({ dir, file: "t.json" })).rejects.toThrow(/typography/);
  });
  it("tells you the exact cp command when the file is outside the project", async () => {
    const { base, dir } = await site();
    const file = join(base, "DESIGN.md");
    writeFileSync(file, "- primary: #112233\n");
    await expect(applyBrand({ dir, file })).rejects.toThrow(
      /cp ".*DESIGN.md" \.\/DESIGN\.md[\s\S]*\.md or \.json/,
    );
  });
  it("writes tokens, sets brand and reports defaults", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "DESIGN.md"), "# Brand\n- primary: #112233\n- accent: #ff0000\n");
    const lines = await applyBrand({ dir, file: join(dir, "DESIGN.md") });
    expect(JSON.parse(read(join(dir, "src/brand.tokens.json"))).colors.primary).toBe("#112233");
    expect(JSON.parse(read(join(dir, "toros.json"))).brand).toBe("DESIGN.md");
    expect(lines.join("\n")).toMatch(/Warning:.*heading font/);
  });
  it("is idempotent", async () => {
    const { dir } = await site();
    writeFileSync(join(dir, "DESIGN.md"), "- primary: #112233\n");
    await applyBrand({ dir, file: "DESIGN.md" });
    const first = read(join(dir, "toros.json"));
    await applyBrand({ dir, file: "DESIGN.md" });
    expect(read(join(dir, "toros.json"))).toBe(first);
  });
  it("refuses files outside the project and symlink escapes", async () => {
    const { base, dir } = await site();
    writeFileSync(join(base, "secret.md"), "- primary: #000000\n");
    await expect(applyBrand({ dir, file: join(base, "secret.md") })).rejects.toThrow(/outside/);
    await expect(applyBrand({ dir, file: "../secret.md" })).rejects.toThrow(/outside/);
    symlinkSync(join(base, "secret.md"), join(dir, "link.md"));
    await expect(applyBrand({ dir, file: "link.md" })).rejects.toThrow(/outside/);
  });
  it("rejects a missing file and malformed toros.json", async () => {
    const { dir } = await site();
    await expect(applyBrand({ dir, file: "nope.md" })).rejects.toThrow();
    const bad = await site("{nope");
    writeFileSync(join(bad.dir, "D.md"), "- primary: #112233\n");
    await expect(applyBrand({ dir: bad.dir, file: "D.md" })).rejects.toThrow(/not valid JSON/);
  });
});
