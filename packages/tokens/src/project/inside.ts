import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

function realOfNearestExisting(p: string): string {
  let current = p;
  const tail: string[] = [];
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break;
    tail.unshift(basename(current));
    current = parent;
  }
  return resolve(realpathSync(current), ...tail);
}

/** Resolves p against root and refuses anything that ends up outside it, including via symlinks. */
export function resolveInside(
  root: string,
  p: string,
  hint = "use a path inside the project",
): string {
  const target = realOfNearestExisting(resolve(root, p));
  const rel = relative(root, target);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return target;
  throw new Error(`Path "${p}" is outside the project root (${root}). Fix: ${hint}.`);
}

export function projectDirOf(dir: string): string {
  if (!existsSync(resolve(dir, "bevl.json"))) {
    throw new Error(`No bevl.json in ${resolve(dir)}. Fix: pass the folder of a Bevl project.`);
  }
  return realpathSync(resolve(dir));
}
