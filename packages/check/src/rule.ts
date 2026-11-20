import type { Page } from "playwright";
import type { Finding } from "./report.js";

export interface RuleContext {
  page: Page;
  viewport: { name: string; width: number; height: number; isMobile: boolean };
  url: string;
  projectDir: string;
}

export interface Rule {
  id: string; // e.g. "load/ready"
  group: string; // e.g. "load"
  severity: "error" | "warn" | "info";
  description: string;
  run(ctx: RuleContext): Promise<Finding[]>; // empty array = passed
}
