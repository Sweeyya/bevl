import { describe, expect, it } from "vitest";
import { isLocalHost, isTestModeAllowed } from "../testmode.js";

describe("isTestModeAllowed", () => {
  it("defaults to local hosts only", () => {
    for (const h of ["localhost", "127.0.0.1", "[::1]", "app.localhost", "LOCALHOST"]) {
      expect(isTestModeAllowed(undefined, h)).toBe(true);
    }
    for (const h of ["example.com", "localhost.evil.com", "10.0.0.1", "mylocalhost"]) {
      expect(isTestModeAllowed(undefined, h)).toBe(false);
      expect(isTestModeAllowed("localhost", h)).toBe(false);
    }
  });
  it("always and never override the host", () => {
    expect(isTestModeAllowed("always", "example.com")).toBe(true);
    expect(isTestModeAllowed("never", "localhost")).toBe(false);
  });
  it("isLocalHost rejects lookalikes", () => {
    expect(isLocalHost("evil-localhost")).toBe(false);
    expect(isLocalHost("localhost.example.com")).toBe(false);
  });
});
