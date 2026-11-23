import { describe, expect, it } from "vitest";
import { recipeChoreography, recipeNames } from "../index.js";
import { type RecipeInput, type RecipeKind, recommendRecipes } from "../recommend.js";

const top = (input: RecipeInput) => recommendRecipes(input)[0]?.name;

describe("recommendRecipes", () => {
  it.each<[RecipeKind, number, string]>([
    ["story", 5, "fly-through"],
    ["landing", 4, "fly-through"],
    ["product", 4, "orbit-product"],
    ["portfolio", 6, "horizontal-gallery"],
    ["gallery", 6, "horizontal-gallery"],
    ["venue", 5, "room"],
    ["saas", 5, "fly-through"],
    ["event", 5, "sphere-of-screens"],
    ["other", 4, "fly-through"],
  ])("%s with %i sections picks %s", (kind, sectionCount, expected) => {
    expect(top({ kind, sectionCount })).toBe(expected);
  });

  it("ranks all six recipes with reasons, best first", () => {
    const ranking = recommendRecipes({ kind: "story", sectionCount: 4 });
    expect(ranking.map((r) => r.name).sort()).toEqual([...recipeNames].sort());
    expect(ranking.map((r) => r.score)).toEqual(ranking.map((r) => r.score).sort((a, b) => b - a));
    expect(ranking[0]?.reasons.length).toBeGreaterThan(0);
  });

  it.each([1, 12])("handles %i sections", (sectionCount) => {
    expect(recommendRecipes({ kind: "gallery", sectionCount })).toHaveLength(6);
  });

  it("penalises recipes that need three or more sections", () => {
    expect(top({ kind: "gallery", sectionCount: 1 })).not.toBe("horizontal-gallery");
    expect(top({ kind: "gallery", sectionCount: 3 })).toBe("horizontal-gallery");
  });

  it("lets tone and a hero object change the winner", () => {
    expect(top({ kind: "landing", sectionCount: 5, tone: ["cozy", "calm"] })).toBe("room");
    expect(top({ kind: "landing", sectionCount: 5, tone: ["Playful", "abstract"] })).toBe(
      "sphere-of-screens",
    );
    expect(top({ kind: "landing", sectionCount: 5, heroObject: true })).toBe("orbit-product");
    expect(top({ kind: "saas", sectionCount: 6, tone: ["minimal"] })).toBe("carousel");
  });

  it("is deterministic and breaks ties by recipe order", () => {
    const input: RecipeInput = { kind: "other", sectionCount: 4, tone: ["calm"] };
    expect(recommendRecipes(input)).toEqual(recommendRecipes(input));
    const ties = recommendRecipes({ kind: "other", sectionCount: 1 }).filter((r) => r.score === 0);
    expect(ties.map((r) => r.name)).toEqual(
      recipeNames.filter((n) => ties.some((t) => t.name === n)),
    );
  });

  it("lets every recipe win for some realistic input", () => {
    const kinds: RecipeKind[] = [
      "landing",
      "product",
      "portfolio",
      "gallery",
      "story",
      "venue",
      "saas",
      "event",
      "other",
    ];
    const tones = [[], ["cozy"], ["playful"], ["minimal"]];
    const winners = new Set<string | undefined>();
    for (const kind of kinds)
      for (const tone of tones)
        for (const heroObject of [false, true])
          for (const sectionCount of [1, 4, 8, 12])
            winners.add(top({ kind, sectionCount, tone, heroObject }));
    expect([...winners].sort()).toEqual([...recipeNames].sort());
  });
});

describe("recipeChoreography", () => {
  it("builds a valid choreography for each recipe", () => {
    for (const name of recipeNames) {
      expect(recipeChoreography(name, ["a", "b", "c", "d"]).beats).toHaveLength(4);
    }
  });

  it("rejects an unknown recipe with a Fix", () => {
    expect(() => recipeChoreography("zoom", ["a"])).toThrow(
      /Unknown recipe "zoom".*Fix: use one of/,
    );
  });
});
