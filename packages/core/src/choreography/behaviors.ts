import type { Behavior } from "./types.js";

const registry = new Map<string, Behavior>();

export function registerBehavior(name: string, fn: Behavior): void {
  registry.set(name, fn);
}

export function getBehavior(name: string): Behavior | undefined {
  return registry.get(name);
}

export function behaviorNames(): string[] {
  return [...registry.keys()];
}

export function clearBehaviors(): void {
  registry.clear();
}
