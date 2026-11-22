import type { KeyValue } from "./types.js";

interface Settable {
  set: (...args: unknown[]) => unknown;
  setScalar?: (n: number) => unknown;
}

function isSettable(v: unknown): v is Settable {
  return typeof v === "object" && v !== null && typeof (v as Settable).set === "function";
}

/**
 * Set a dot-path prop on a scene object. Vector3/Euler/Color props use `.set`;
 * plain fields are assigned. Returns false if the path does not resolve.
 */
export function setProp(root: object, path: string, value: KeyValue): boolean {
  const parts = path.split(".");
  const key = parts.pop();
  let parent: unknown = root;
  for (const part of parts) {
    parent =
      typeof parent === "object" && parent !== null
        ? (parent as Record<string, unknown>)[part]
        : undefined;
  }
  if (!key || typeof parent !== "object" || parent === null) return false;
  const record = parent as Record<string, unknown>;
  const current = record[key];
  if (isSettable(current)) {
    if (Array.isArray(value)) current.set(value[0], value[1], value[2]);
    else if (typeof value === "number" && current.setScalar) current.setScalar(value);
    else current.set(value);
    return true;
  }
  if (!(key in record)) return false;
  record[key] = value;
  return true;
}
