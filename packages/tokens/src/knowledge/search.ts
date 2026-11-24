import type { Knowledge } from "./schema.js";

export interface KnowledgeQuery {
  text?: string;
  tags?: string[];
  kind?: Knowledge["kind"];
  limit?: number;
}

export interface KnowledgeMatch {
  id: string;
  kind: Knowledge["kind"];
  title: string;
  tags: string[];
  seen?: number;
  summary: string;
  score: number;
  reasons: string[];
}

const BODY_CAP = 4;

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3);

const stem = (w: string): string => w.replace(/(ing|ed|es|s)$/, "");

export function summaryOf(body: string): string {
  const first = body.split(/\n\s*\n/)[0] ?? body;
  const flat = first.replace(/\s+/g, " ").trim();
  return flat.length > 200 ? `${flat.slice(0, 197)}...` : flat;
}

/** Plain tag and keyword matching, so results are deterministic and need no model or network. */
export function searchKnowledge(entries: Knowledge[], query: KnowledgeQuery): KnowledgeMatch[] {
  const tags = (query.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  const wanted = [...new Set(words(query.text ?? "").map(stem))];
  const empty = tags.length === 0 && wanted.length === 0;
  const limit = query.limit ?? 5;

  const scored = entries
    .filter((e) => !query.kind || e.kind === query.kind)
    .map((e): KnowledgeMatch => {
      const reasons: string[] = [];
      let score = 0;
      for (const tag of tags) {
        if (e.tags.includes(tag)) {
          score += 3;
          reasons.push(`tag: ${tag}`);
        }
      }
      const tagWords = new Set(e.tags.flatMap((t) => t.split("-")).map(stem));
      const titleWords = new Set(words(e.title).map(stem));
      const bodyWords = new Set(words(e.body).map(stem));
      const hits: string[] = [];
      for (const w of wanted) {
        if (tagWords.has(w)) {
          score += 3;
          hits.push(w);
        } else if (titleWords.has(w)) {
          score += 2;
          hits.push(w);
        }
      }
      const bodyHits = wanted
        .filter((w) => bodyWords.has(w) && !hits.includes(w))
        .slice(0, BODY_CAP);
      score += bodyHits.length;
      hits.push(...bodyHits);
      if (hits.length > 0) reasons.push(`mentions: ${hits.join(", ")}`);
      return {
        id: e.id,
        kind: e.kind,
        title: e.title,
        tags: e.tags,
        ...(e.seen !== undefined && { seen: e.seen }),
        summary: summaryOf(e.body),
        score,
        reasons,
      };
    });

  return scored
    .filter((m) => empty || m.score > 0)
    .sort((a, b) => b.score - a.score || (b.seen ?? 0) - (a.seen ?? 0) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function getKnowledge(entries: Knowledge[], id: string): Knowledge | undefined {
  return entries.find((e) => e.id === id);
}
