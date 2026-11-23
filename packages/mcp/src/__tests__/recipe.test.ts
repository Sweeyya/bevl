import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recipeNames } from "@toros/core";
import { afterAll, describe, expect, it } from "vitest";
import { applyRecipeTool, recommendRecipeTool } from "../recipe.js";

const root = realpathSync(mkdtempSync(join(tmpdir(), "toros-recipe-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const env = { TOROS_PROJECT_ROOT: root };
const config = { name: "s", sections: ["a", "b", "c", "d"].map((id) => ({ id, title: id })) };
writeFileSync(join(root, "toros.json"), JSON.stringify(config));
const read = () => JSON.parse(readFileSync(join(root, "toros.json"), "utf8"));

describe("recipe tools", () => {
  it("recommends all six recipes", () => {
    const ranking = JSON.parse(recommendRecipeTool({ kind: "venue", sections: 4 }));
    expect(ranking).toHaveLength(recipeNames.length);
    expect(ranking[0].name).toBe("room");
  });

  it("applies a recipe, idempotently, keeping other fields", async () => {
    await applyRecipeTool({ name: "carousel" }, env);
    const first = read();
    await applyRecipeTool({ name: "carousel" }, env);
    expect(read()).toEqual(first);
    expect(first.name).toBe("s");
    expect(first.choreography.beats.map((b: { id: string }) => b.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects an unknown recipe with a Fix and a path outside the root", async () => {
    await expect(applyRecipeTool({ name: "zoom" }, env)).rejects.toThrow(/Fix: use one of/);
    await expect(applyRecipeTool({ name: "room", projectDir: ".." }, env)).rejects.toThrow();
  });
});
