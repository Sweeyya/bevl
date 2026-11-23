import { describe, expect, it } from "vitest";
import { DESIGN_RULES, VERSION } from "../index.js";

describe("@toros/core", () => {
  it("exports a version string", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("design rules are locked to the values in PROJECT_PLAN.md §6 and TESTING.md §4", () => {
    expect(DESIGN_RULES.MAX_ROLL_DEG).toBe(2);
    expect(DESIGN_RULES.MAX_TURN_PER_STEP_DEG).toBe(15);
    expect(DESIGN_RULES.MAX_MOVE_PER_STEP_M).toBe(1.5);
    expect(DESIGN_RULES.MAX_TEXT_MESH_CHARS).toBe(40);
  });
});
