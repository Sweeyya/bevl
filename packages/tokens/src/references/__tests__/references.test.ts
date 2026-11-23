import { describe, expect, it } from "vitest";
import { getReference, referenceSchema, references, searchReferences } from "../index.js";

describe("reference entries", () => {
  it("are all valid with unique ids", () => {
    for (const entry of references) expect(referenceSchema.safeParse(entry).success).toBe(true);
    expect(new Set(references.map((r) => r.id)).size).toBe(references.length);
  });

  it("mark exactly the four first targets", () => {
    const first = references.filter((r) => r.priority === "first").map((r) => r.id);
    expect(first.sort()).toEqual([
      "dark-japanese-shrine",
      "product-can-studio",
      "retro-device-screen",
      "white-gallery-hall",
    ]);
  });

  it("never mark an entry needing external assets as buildable from code alone", () => {
    for (const r of references) {
      const external = r.assets.some((a) => a.from === "external");
      if (r.feasibility === "code-only") {
        expect(r.assets.filter((a) => a.from === "external").every((a) => a.note.length > 0)).toBe(
          true,
        );
      }
      if (r.feasibility === "needs-assets") expect(external).toBe(true);
    }
  });

  it("can be looked up by id", () => {
    expect(getReference("white-gallery-hall")?.camera).toBe("glide-along-path");
    expect(getReference("nope")).toBeUndefined();
  });
});

describe("searchReferences", () => {
  it("finds the dark moody scene for dark atmospheric tones", () => {
    const top = searchReferences({ tone: ["dark", "atmospheric"] })[0];
    expect(top?.reference.id).toBe("dark-japanese-shrine");
    expect(top?.reasons).toContain("mood: dark");
  });

  it("finds the gallery for a clean portfolio", () => {
    expect(
      searchReferences({ kind: "portfolio", tone: ["clean", "bright"] })[0]?.reference.id,
    ).toBe("white-gallery-hall");
  });

  it("finds the cans for a glossy product", () => {
    expect(searchReferences({ kind: "product", tone: ["glossy"] })[0]?.reference.id).toBe(
      "product-can-studio",
    );
  });

  it("finds the retro machine for retro tactile tones", () => {
    expect(searchReferences({ tone: ["retro", "tactile"] })[0]?.reference.id).toBe(
      "retro-device-screen",
    );
  });

  it("matches free text against the descriptions", () => {
    const hit = searchReferences({ text: "scanline screen buttons" })[0];
    expect(hit?.reference.id).toBe("retro-device-screen");
  });

  it("is deterministic, respects the limit, and lists everything for an empty query", () => {
    expect(searchReferences({ tone: ["retro"] })).toEqual(searchReferences({ tone: ["retro"] }));
    expect(searchReferences({}, references)).toHaveLength(5);
    expect(searchReferences({ limit: 20 })).toHaveLength(references.length);
    expect(searchReferences({ limit: 2 })).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchReferences({ tone: ["zzzz"] })).toEqual([]);
  });
});
