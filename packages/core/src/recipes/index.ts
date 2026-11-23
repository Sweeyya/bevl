import { validateChoreography } from "../choreography/schema.js";
import type { Choreography } from "../choreography/types.js";
import { carousel } from "./carousel.js";
import { flyThrough } from "./flyThrough.js";
import { horizontalGallery } from "./horizontalGallery.js";
import { orbitProduct } from "./orbitProduct.js";
import { room } from "./room.js";
import type { Recipe } from "./shared.js";
import { sphereOfScreens } from "./sphereOfScreens.js";

export type { Recipe };

export const recipes = {
  "fly-through": flyThrough,
  "sphere-of-screens": sphereOfScreens,
  carousel,
  room,
  "horizontal-gallery": horizontalGallery,
  "orbit-product": orbitProduct,
} satisfies Record<string, Recipe>;

export type RecipeName = keyof typeof recipes;

export const recipeNames = Object.keys(recipes) as RecipeName[];

export function getRecipe(name: string): Recipe | undefined {
  return (recipeNames as string[]).includes(name) ? recipes[name as RecipeName] : undefined;
}

/** Build a recipe's choreography for the given sections and validate it. Throws with a Fix. */
export function recipeChoreography(name: string, sectionIds: string[]): Choreography {
  const recipe = getRecipe(name);
  if (!recipe) {
    throw new Error(`Unknown recipe "${name}". Fix: use one of ${recipeNames.join(", ")}.`);
  }
  const result = validateChoreography(recipe.create(sectionIds), sectionIds);
  if (!result.ok) throw new Error(`Recipe "${name}" is invalid: ${result.errors.join("; ")}`);
  return result.value;
}
