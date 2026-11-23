# 009: Applying a recipe: pure build in core, file write in tokens

`toros recipe apply` and the MCP `apply_recipe` tool must do the same thing. `cli` and `mcp` may not depend on each other, so the shared logic is split by what each package may know:

- `@toros/core` has `recipeChoreography(name, sectionIds)`: builds a recipe's choreography and validates it with the core schema. An unknown name throws with a `Fix:`. It also has `recommendRecipes`, a pure and deterministic decision table.
- `@toros/tokens` has `applyChoreography({ dir, build })` next to `add-section` (see ADR 004). It reads `toros.json`, replaces `choreography` with what `build` returns for the current section ids, and writes it back. It knows nothing about recipes, so `tokens` stays free of `@toros/*` dependencies.
- `cli` and `mcp` each add `@toros/core` as a dependency, join the two in one line, and add their own argument handling and path confinement.

`ARCHITECTURE.md` §6 does not list `core` for `cli` and `mcp`; this adds that edge. It is acyclic, because `core` depends on nothing in the repo.
