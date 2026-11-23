import { describe, expect, it } from "vitest";
import { EXIT_CODES, VERSION } from "../index.js";

describe("@toros/check", () => {
  it("exports a version string", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("exit codes match the spec in TESTING.md §3", () => {
    expect(EXIT_CODES.PASSED).toBe(0);
    expect(EXIT_CODES.FINDINGS).toBe(1);
    expect(EXIT_CODES.BAD_USAGE).toBe(2);
    expect(EXIT_CODES.ENV_ERROR).toBe(3);
  });
});
