import type { TestModeSetting } from "./contract.js";

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return LOCAL.has(h) || h.endsWith(".localhost");
}

/** Test mode (?bevl-test) is only honored on local hosts unless the config opts in with "always". */
export function isTestModeAllowed(setting: TestModeSetting | undefined, hostname: string): boolean {
  if (setting === "never") return false;
  if (setting === "always") return true;
  return isLocalHost(hostname);
}
