import { describe, expect, it } from "vitest";
import { VERSION } from "../index.js";

describe("@bevl/effects", () => {
  it("exports a version string", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
