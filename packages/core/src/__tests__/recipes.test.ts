import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { cameraPoseAt } from "../choreography/pose.js";
import { validateChoreography } from "../choreography/schema.js";
import { DESIGN_RULES, getRecipe, recipeNames, recipes } from "../index.js";

const COUNTS = [1, 2, 3, 5, 8, 12];
const STEPS = 200;
const idsFor = (n: number): string[] => Array.from({ length: n }, (_, i) => `s${i + 1}`);

describe.each(recipeNames)("recipe %s", (name) => {
  const recipe = recipes[name];

  it("has metadata", () => {
    expect(recipe.name).toBe(name);
    for (const text of [recipe.description, recipe.whenToUse, recipe.feel]) {
      expect(text.length).toBeGreaterThan(10);
    }
    expect(getRecipe(name)).toBe(recipe);
  });

  it.each(COUNTS)("works with %i sections", (n) => {
    const ids = idsFor(n);
    const choreo = recipe.create(ids);

    const result = validateChoreography(choreo, ids);
    expect(result.errors ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    expect(choreo.allow).toBeUndefined();

    expect(choreo.beats.map((b) => b.id)).toEqual(ids);
    const at = choreo.beats.map((b) => b.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(at[0]).toBe(0);
    if (n > 1) expect(at[n - 1]).toBe(1);

    expect(JSON.parse(JSON.stringify(choreo))).toEqual(choreo);
    expect(recipe.create(ids)).toEqual(choreo);

    let maxMove = 0;
    let maxTurn = 0;
    let maxRoll = 0;
    let prev = cameraPoseAt(choreo, 0);
    for (let i = 0; i <= STEPS; i++) {
      const pose = cameraPoseAt(choreo, i / STEPS);
      const q = new Quaternion(
        pose.quaternion.x,
        pose.quaternion.y,
        pose.quaternion.z,
        pose.quaternion.w,
      );
      const pq = new Quaternion(
        prev.quaternion.x,
        prev.quaternion.y,
        prev.quaternion.z,
        prev.quaternion.w,
      );
      maxMove = Math.max(
        maxMove,
        Math.hypot(
          pose.position.x - prev.position.x,
          pose.position.y - prev.position.y,
          pose.position.z - prev.position.z,
        ),
      );
      maxTurn = Math.max(maxTurn, (pq.angleTo(q) * 180) / Math.PI);
      const right = new Vector3(1, 0, 0).applyQuaternion(q);
      maxRoll = Math.max(maxRoll, (Math.asin(Math.min(1, Math.abs(right.y))) * 180) / Math.PI);
      prev = pose;
    }
    const perStep = STEPS / 40;
    expect(maxMove * perStep).toBeLessThan(DESIGN_RULES.MAX_MOVE_PER_STEP_M);
    expect(maxTurn * perStep).toBeLessThan(DESIGN_RULES.MAX_TURN_PER_STEP_DEG);
    expect(maxRoll).toBeLessThan(DESIGN_RULES.MAX_ROLL_DEG);
  });

  it("handles zero sections", () => {
    expect(() => recipe.create([])).not.toThrow();
  });
});

describe("recipes registry", () => {
  it("lists six recipes and rejects unknown names", () => {
    expect(recipeNames).toHaveLength(6);
    expect(getRecipe("nope")).toBeUndefined();
    expect(getRecipe("constructor")).toBeUndefined();
  });

  it("enables horizontal swipe on touch for horizontal-gallery", () => {
    expect(recipes["horizontal-gallery"].create(idsFor(3)).input?.coarse).toContain("swipe-x");
  });

  it("recipe sources never use Math.random, Date.now or timers", () => {
    const dir = join(import.meta.dirname, "..", "recipes");
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), "utf8");
      expect(source, file).not.toMatch(
        /Math\.random|Date\.now|setTimeout|setInterval|performance\.now/,
      );
    }
  });
});
