import { recipeChoreography, recommendRecipes } from "@toros/core";
import { applyChoreography } from "@toros/tokens";
import { projectRoot, resolveInside } from "./guard.js";

export interface RecommendRecipeArgs {
  kind:
    | "landing"
    | "product"
    | "portfolio"
    | "gallery"
    | "story"
    | "venue"
    | "saas"
    | "event"
    | "other";
  sections: number;
  tone?: string[] | undefined;
  heroObject?: boolean | undefined;
}

export interface ApplyRecipeArgs {
  name: string;
  projectDir?: string | undefined;
}

export function recommendRecipeTool(args: RecommendRecipeArgs): string {
  return JSON.stringify(
    recommendRecipes({
      kind: args.kind,
      sectionCount: args.sections,
      ...(args.tone !== undefined && { tone: args.tone }),
      ...(args.heroObject !== undefined && { heroObject: args.heroObject }),
    }),
    null,
    2,
  );
}

export async function applyRecipeTool(args: ApplyRecipeArgs, env: NodeJS.ProcessEnv = process.env) {
  const dir = resolveInside(projectRoot(env), args.projectDir ?? ".");
  return (
    await applyChoreography({ dir, build: (ids) => recipeChoreography(args.name, ids) })
  ).join("\n");
}
