import type { BriefKind } from "../taste/brief.js";
import { references } from "./entries.js";
import type { Reference } from "./schema.js";

export interface ReferenceQuery {
  kind?: BriefKind;
  tone?: string[];
  archetype?: string;
  text?: string;
  limit?: number;
}

export interface ReferenceMatch {
  reference: Reference;
  score: number;
  reasons: string[];
}

const TEXT_CAP = 4;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3);
}

export function searchReferences(
  query: ReferenceQuery,
  entries: Reference[] = references,
): ReferenceMatch[] {
  const tone = (query.tone ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  const wanted = [...new Set(words(query.text ?? ""))];
  const limit = query.limit ?? 5;
  const empty = !query.kind && tone.length === 0 && !query.archetype && wanted.length === 0;

  const scored = entries.map((reference): ReferenceMatch => {
    const reasons: string[] = [];
    let score = 0;
    if (query.kind && reference.suggestedKinds.includes(query.kind)) {
      score += 3;
      reasons.push(`suits ${query.kind} sites`);
    }
    if (query.archetype && reference.archetype === query.archetype) {
      score += 3;
      reasons.push(`archetype ${reference.archetype}`);
    }
    const mood = reference.mood.map((m) => m.toLowerCase());
    for (const word of tone) {
      if (mood.some((m) => m === word || m.includes(word))) {
        score += 2;
        reasons.push(`mood: ${word}`);
      }
    }
    if (wanted.length > 0) {
      const haystack = new Set(
        words(
          [
            reference.title,
            reference.summary,
            reference.typography,
            reference.motion,
            ...reference.mood,
            ...reference.liked,
            ...reference.interaction,
          ].join(" "),
        ),
      );
      const hits = wanted.filter((w) => haystack.has(w)).slice(0, TEXT_CAP);
      if (hits.length > 0) {
        score += hits.length;
        reasons.push(`mentions: ${hits.join(", ")}`);
      }
    }
    return { reference, score, reasons };
  });

  return scored
    .filter((m) => empty || m.score > 0)
    .sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id))
    .slice(0, limit);
}

export function getReference(id: string, entries: Reference[] = references): Reference | undefined {
  return entries.find((r) => r.id === id);
}
