import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatKnowledge,
  getKnowledge,
  lintKnowledge,
  loadKnowledge,
  parseKnowledge,
  recordLesson,
  searchKnowledge,
} from "../index.js";

const bundled = loadKnowledge();
const tmp = () => mkdtempSync(join(tmpdir(), "toros-knowledge-"));

describe("bundled knowledge", () => {
  it("loads with no problems and passes lint", () => {
    expect(bundled.problems).toEqual([]);
    expect(lintKnowledge(bundled.entries)).toEqual([]);
  });

  it("has the seed lessons and the craft notes", () => {
    const ids = bundled.entries.map((e) => e.id);
    for (const id of [
      "near-black-surfaces",
      "font-lines-dropped",
      "font-names-need-quotes",
      "reduced-motion-staging",
      "no-rounded-corners",
      "contrast-fix-backing-panel",
    ]) {
      expect(ids).toContain(id);
    }
    expect(bundled.entries.filter((e) => e.kind === "note").length).toBeGreaterThanOrEqual(6);
  });

  it("keeps lessons in the Mistake and Rule shape", () => {
    for (const e of bundled.entries.filter((x) => x.kind === "lesson")) {
      expect(e.body, e.id).toMatch(/^Mistake: /);
      expect(e.body, e.id).toContain("Rule: ");
      expect(e.seen, e.id).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("parseKnowledge", () => {
  it("round-trips through formatKnowledge", () => {
    const entry = {
      id: "a-note",
      kind: "note" as const,
      title: "A note",
      tags: ["one", "two"],
      body: "A body that is long enough.",
    };
    const result = parseKnowledge(formatKnowledge(entry), "x.md", "bundled");
    expect(result).toEqual({ ok: true, entry: { ...entry, source: "bundled" } });
  });

  it("reports a missing frontmatter and bad fields with a Fix line", () => {
    const none = parseKnowledge("hello", "x.md", "bundled");
    expect(none.ok || none.error).toContain("Fix:");
    const bad = parseKnowledge(
      "---\nid: Bad Id\nkind: note\ntitle: T\ntags: a\n---\nlong enough body text here",
      "x.md",
      "bundled",
    );
    expect(bad.ok).toBe(false);
  });
});

describe("searchKnowledge", () => {
  const top = (text: string) => searchKnowledge(bundled.entries, { text })[0]?.id;

  it("finds the lighting lesson for a dark brand that looks black", () => {
    expect(top("my dark brand looks almost black")).toBe("near-black-surfaces");
  });

  it("finds the right entry for common prompts", () => {
    expect(top("fonts fell back to defaults")).toBe("font-lines-dropped");
    expect(top("text unreadable contrast")).toBe("contrast-fix-backing-panel");
    expect(top("which port for the dev server")).toBe("dev-server-ports");
    expect(top("choreography is ignored")).toBe("choreography-in-app");
    expect(top("prefers reduced motion")).toBe("reduced-motion-staging");
  });

  it("filters by kind and tag, and is deterministic", () => {
    const lessons = searchKnowledge(bundled.entries, { tags: ["brand"], kind: "lesson" });
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.every((m) => m.kind === "lesson")).toBe(true);
    expect(searchKnowledge(bundled.entries, { tags: ["brand"] })).toEqual(
      searchKnowledge(bundled.entries, { tags: ["brand"] }),
    );
  });

  it("returns nothing for words that match nothing, and everything for an empty query", () => {
    expect(searchKnowledge(bundled.entries, { text: "zebra giraffe" })).toEqual([]);
    expect(searchKnowledge(bundled.entries, { limit: 100 }).length).toBe(bundled.entries.length);
  });

  it("looks entries up by id", () => {
    expect(getKnowledge(bundled.entries, "brand-roles")?.kind).toBe("note");
    expect(getKnowledge(bundled.entries, "nope")).toBeUndefined();
  });
});

describe("project knowledge and lessons", () => {
  const input = {
    id: "my-lesson",
    title: "A project lesson",
    tags: ["lighting"],
    mistake: "Something went wrong in a way worth keeping.",
    rule: "Do the other thing next time.",
  };

  it("records a lesson, raises seen on repeat, and loads it next to the bundled files", () => {
    const dir = tmp();
    expect(recordLesson(dir, input)).toMatchObject({ created: true, seen: 1 });
    expect(recordLesson(dir, input)).toMatchObject({ created: false, seen: 2 });
    const loaded = loadKnowledge({ projectDir: dir });
    const mine = getKnowledge(loaded.entries, "my-lesson");
    expect(mine).toMatchObject({ source: "project", seen: 2, kind: "lesson" });
    expect(loaded.entries.length).toBe(bundled.entries.length + 1);
  });

  it("lets a project entry replace a bundled one with the same id", () => {
    const dir = tmp();
    recordLesson(dir, { ...input, id: "near-black-surfaces", title: "Local override" });
    const e = getKnowledge(loadKnowledge({ projectDir: dir }).entries, "near-black-surfaces");
    expect(e?.title).toBe("Local override");
  });

  it("rejects an invalid lesson with a Fix line", () => {
    expect(() => recordLesson(tmp(), { ...input, id: "Bad Id" })).toThrow(/Fix:/);
    expect(() => recordLesson(tmp(), { ...input, rule: "" })).toThrow(/Fix:/);
  });

  it("skips symlinks, oversized files and bad files, and reports them", () => {
    const dir = tmp();
    const kdir = join(dir, ".toros", "knowledge", "notes");
    mkdirSync(kdir, { recursive: true });
    writeFileSync(join(kdir, "big.md"), "x".repeat(20_000));
    writeFileSync(join(kdir, "bad.md"), "no frontmatter");
    const outside = tmp();
    writeFileSync(
      join(outside, "secret.md"),
      "---\nid: secret-one\nkind: note\ntitle: S\ntags: a\n---\nlong enough body text here",
    );
    symlinkSync(join(outside, "secret.md"), join(kdir, "link.md"));
    const loaded = loadKnowledge({ projectDir: dir });
    expect(getKnowledge(loaded.entries, "secret-one")).toBeUndefined();
    expect(loaded.problems.length).toBe(2);
  });
});

describe("lintKnowledge", () => {
  const e = (id: string, title: string, tags: string[]) => ({
    id,
    kind: "note" as const,
    title,
    tags,
    body: "a body that is long enough",
    source: "bundled" as const,
  });

  it("flags duplicate ids, duplicate titles and near-identical tags", () => {
    expect(lintKnowledge([e("a-one", "Same", ["x"]), e("a-two", "same!", ["y"])])[0]).toContain(
      "same title",
    );
    expect(lintKnowledge([e("a-one", "One", ["x"]), e("a-one", "Two", ["y"])])[0]).toContain(
      "appears 2 times",
    );
    expect(
      lintKnowledge([e("a-one", "One", ["a", "b", "c"]), e("b-two", "Two", ["a", "b", "c"])])[0],
    ).toContain("share almost all tags");
  });
});
