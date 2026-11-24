import type { Knowledge } from "./schema.js";

/** Finds duplicate ids and titles, and near-duplicates (same kind, almost the same tags). */
export function lintKnowledge(entries: Knowledge[]): string[] {
  const problems: string[] = [];
  const ids = new Map<string, number>();
  const titles = new Map<string, string>();
  for (const e of entries) {
    ids.set(e.id, (ids.get(e.id) ?? 0) + 1);
    const key = e.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const other = titles.get(key);
    if (other && other !== e.id) {
      problems.push(`"${e.id}" and "${other}" have the same title. Fix: merge them.`);
    }
    titles.set(key, e.id);
  }
  for (const [id, n] of ids) {
    if (n > 1) problems.push(`id "${id}" appears ${n} times. Fix: give each entry its own id.`);
  }
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (!a || !b || a.kind !== b.kind || a.id === b.id) continue;
      const shared = a.tags.filter((t) => b.tags.includes(t)).length;
      const union = new Set([...a.tags, ...b.tags]).size;
      if (a.tags.length >= 3 && shared / union >= 0.8) {
        problems.push(
          `"${a.id}" and "${b.id}" share almost all tags. Fix: merge them or tag them apart.`,
        );
      }
    }
  }
  return problems;
}
