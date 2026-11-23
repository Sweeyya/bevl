---
"@toros/core": minor
---

Add a library of example scroll choreographies: `recipes`, `recipeNames`, `getRecipe` and the `Recipe` type. Recipes are `fly-through`, `sphere-of-screens`, `carousel`, `room`, `horizontal-gallery` and `orbit-product`. Each is a plain function `(sectionIds) => Choreography` that works for 1 to 12 sections and stays inside the motion limits without any `allow` opt-outs. Agents can start from one and edit it, or write their own.
