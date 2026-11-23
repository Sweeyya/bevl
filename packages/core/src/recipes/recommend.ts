import { type RecipeName, recipeNames } from "./index.js";

export type RecipeKind =
  | "landing"
  | "product"
  | "portfolio"
  | "gallery"
  | "story"
  | "venue"
  | "saas"
  | "event"
  | "other";

export interface RecipeInput {
  kind: RecipeKind;
  sectionCount: number;
  tone?: string[];
  heroObject?: boolean;
}

export interface RecipeRanking {
  name: RecipeName;
  score: number;
  reasons: string[];
}

type Weights = Partial<Record<RecipeName, number>>;

const BY_KIND: Record<RecipeKind, Weights> = {
  story: { "fly-through": 6, room: 2, "horizontal-gallery": 1 },
  landing: { "fly-through": 5, carousel: 2, "orbit-product": 1, room: 1 },
  product: { "orbit-product": 6, "fly-through": 2, carousel: 1 },
  portfolio: { "horizontal-gallery": 6, carousel: 3, "fly-through": 1 },
  gallery: { "horizontal-gallery": 6, carousel: 4, room: 1 },
  venue: { room: 6, "fly-through": 2, "horizontal-gallery": 1 },
  saas: { "fly-through": 4, carousel: 3, "sphere-of-screens": 1, "orbit-product": 1 },
  event: { "sphere-of-screens": 6, "fly-through": 2, carousel: 1 },
  other: { "fly-through": 3, carousel: 1, room: 1 },
};

const BY_TONE: Record<string, Weights> = {
  calm: { room: 2, "horizontal-gallery": 1 },
  cozy: { room: 3 },
  warm: { room: 2 },
  wellness: { room: 3 },
  playful: { "sphere-of-screens": 3, carousel: 1 },
  abstract: { "sphere-of-screens": 3 },
  bold: { "fly-through": 2, "sphere-of-screens": 1 },
  energetic: { "sphere-of-screens": 2, "fly-through": 1 },
  minimal: { carousel: 2, "horizontal-gallery": 1, "orbit-product": 1 },
  luxurious: { "orbit-product": 2, "horizontal-gallery": 1 },
  elegant: { "horizontal-gallery": 2, "orbit-product": 1 },
  techy: { "fly-through": 2, "sphere-of-screens": 1, carousel: 1 },
  futuristic: { "sphere-of-screens": 2, "fly-through": 2 },
  dramatic: { "fly-through": 2 },
  editorial: { "horizontal-gallery": 2 },
};

const HERO_OBJECT: Weights = { "orbit-product": 6 };

/** Preferred section range per recipe: `min` is a hard floor, `best` the sweet spot. */
const SECTIONS: Partial<Record<RecipeName, { min: number; best: [number, number] }>> = {
  "horizontal-gallery": { min: 3, best: [3, 12] },
  carousel: { min: 3, best: [3, 12] },
  room: { min: 1, best: [4, 8] },
  "sphere-of-screens": { min: 1, best: [4, 8] },
};
const BELOW_MIN = -6;
const OUTSIDE_BEST = -1;

export function recommendRecipes(input: RecipeInput): RecipeRanking[] {
  const tones = (input.tone ?? []).map((t) => t.trim().toLowerCase());
  const ranked = recipeNames.map((name, order) => {
    let score = 0;
    const reasons: string[] = [];
    const add = (points: number | undefined, reason: string): void => {
      if (!points) return;
      score += points;
      reasons.push(reason);
    };
    add(BY_KIND[input.kind][name], `suits a ${input.kind} site`);
    for (const tone of tones) add(BY_TONE[tone]?.[name], `matches a ${tone} tone`);
    if (input.heroObject) add(HERO_OBJECT[name], "one hero object to show");
    const range = SECTIONS[name];
    if (range && input.sectionCount < range.min) {
      add(BELOW_MIN, `needs at least ${range.min} sections`);
    } else if (
      range &&
      (input.sectionCount < range.best[0] || input.sectionCount > range.best[1])
    ) {
      add(OUTSIDE_BEST, `works best with ${range.best[0]} to ${range.best[1]} sections`);
    }
    return { name, score, reasons, order };
  });
  return ranked
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ name, score, reasons }) => ({ name, score, reasons }));
}
