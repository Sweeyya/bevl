import { describe, expect, it } from "vitest";
import { recipeNames, recipes } from "../recipes/index.js";
import { moodOf, pillarAngles, planWorld, type WorldKind } from "../world/plan.js";

const ids = ["a", "b", "c", "d"];

describe("planWorld", () => {
  it("recognises every recipe from its choreography", () => {
    for (const name of recipeNames) {
      const plan = planWorld(recipes[name].create(ids), ids);
      expect(plan.kind).toBe(name satisfies WorldKind);
    }
  });

  it("puts the floor below every screen of a room, even pitched ones", () => {
    const ids6 = [...ids, "e", "f"];
    const plan = planWorld(recipes.room.create(ids6), ids6);
    for (const p of plan.positions) expect(plan.floorY).toBeLessThan(p[1] - 1);
    for (const p of plan.positions) expect(plan.ceilingY).toBeGreaterThan(p[1] + 1);
  });

  it("lets the caller override the kind", () => {
    expect(planWorld(recipes.room.create(ids), ids, "carousel").kind).toBe("carousel");
  });

  it("keeps fog beyond the wall of a room so the wall stays clear", () => {
    const plan = planWorld(recipes.room.create(ids), ids);
    expect(plan.fog[0]).toBeGreaterThan(plan.radius + 1);
  });
});

describe("pillarAngles", () => {
  it("puts two pillars in each gap between four walls", () => {
    const plan = planWorld(recipes.room.create(ids), ids);
    const angles = pillarAngles(plan.positions).map((a) => Math.round((a * 180) / Math.PI));
    expect(angles.sort((a, b) => a - b)).toEqual([-153, -117, -63, -27, 27, 63, 117, 153]);
  });

  it("ignores screens on the ceiling and floor", () => {
    expect(pillarAngles([[0, 5, -3]])).toEqual([]);
  });
});

describe("moodOf", () => {
  it("reads dark and light backgrounds", () => {
    expect(moodOf("#101820")).toBe("dark");
    expect(moodOf("#f2efe6")).toBe("light");
  });
});
