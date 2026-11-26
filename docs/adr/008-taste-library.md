# 008: Taste library

## Decision

When a user has no brand, Toros deals one of its own art directions instead of leaving the agent to improvise. The library lives in `packages/tokens/src/taste/` as typed data: six directions, each with a palette, a system-safe font pairing, material and lighting moods, recommended scroll styles, motion hints, set dressing and an avoid list. The brief the user gave (`toros.brief.json`) is validated with a zod schema.

## Original, not copied

The directions are written for Toros. We copy no text or palettes from other tools. We also steer away from the look those tools call an AI default (cream, serif, terracotta; purple or blue gradients; Inter or Arial alone), and from the look Anthropic's skill tends to produce, which the owner does not like.

## Deterministic dealing

`dealDirection(brief, { seed, history })` scores directions by kind and tone-word overlap, drops directions already in history (unless all are), and breaks ties with a seeded PRNG. No `Math.random`, no clock. The same brief and seed give the same direction, so a run can be replayed. `--apply` records the direction and the history in `toros.brief.json`, so the next site looks different.

## Why data files

Plain data can be validated by tests (contrast of every palette is checked at 7:1 for text and 3:1 for the primary colour), read by the CLI and MCP with the same code, and searched later when retrieval over references is added. Applying a direction writes `brand/direction.tokens.json` and runs the normal `apply-brand` path, so there is one way brand tokens reach `src/brand.tokens.json`.

## Check rule

`brand/not-default-look` (warn) fires when no brand is applied and every material is gray or white, and points to `toros taste deal --apply`.
