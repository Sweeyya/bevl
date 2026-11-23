import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

function globToRegExp(glob: string): RegExp {
  const body = glob
    .split("**")
    .map((part) =>
      part
        .split("*")
        .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]+"),
    )
    .join(".+");
  return new RegExp(`^${body}$`);
}

function workspaceGlobs(yaml: string): string[] {
  const block = /^packages:[ \t]*\n((?:[ \t]+.*\n?|\n)*)/m.exec(yaml)?.[1] ?? "";
  return [...block.matchAll(/^\s*-\s*["']?([^"'\s#]+)["']?/gm)].map((m) => m[1] ?? "");
}

/** True when a pnpm-workspace.yaml in a parent folder lists a glob that matches this folder. */
export function inPnpmWorkspace(folder: string): boolean {
  for (let dir = dirname(folder); ; dir = dirname(dir)) {
    const file = join(dir, "pnpm-workspace.yaml");
    if (existsSync(file)) {
      const rel = relative(dir, folder).split(sep).join("/");
      const globs = workspaceGlobs(readFileSync(file, "utf8"));
      const hit = (g: string) => globToRegExp(g.replace(/^!/, "")).test(rel.replace(/^\.\//, ""));
      return (
        globs.some((g) => !g.startsWith("!") && hit(g)) &&
        !globs.some((g) => g.startsWith("!") && hit(g))
      );
    }
    if (dirname(dir) === dir) return false;
  }
}
