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
