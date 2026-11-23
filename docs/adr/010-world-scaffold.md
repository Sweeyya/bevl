# ADR 010: World scaffold (set dressing)

## Status

Accepted.

## Context

A trial site built from the room recipe scored 100 but looked like one brown box on a floor in the dark: surfaces rendered near-black, neighbouring screens were not visible and section text floated beside the screen.

## Decision

1. **Components** in `@toros/core`, all drawn from `useBrand()` colours and meant to sit inside `TorosSite`:
   - `World`: gradient sky (shader, no texture), fog tuned to the recipe's camera range, a soft vignette, and a recipe-shaped floor and walls. Room: round wall, floor, ceiling, accent rings and pillars. Sphere-of-screens: inner shell with a latitude/longitude grid. Fly-through: corridor with floor stripes. Horizontal gallery: floor and back wall. Carousel and orbit-product: studio floor and dais. `mood` ("light" | "dark") defaults to the luminance of `background`.
   - `ScreenFrame`: put inside `<Section>`. Rounded brand-surface panel with an emissive accent edge; children sit on its face. Size and opacity come from the recipe (fly-through frames are see-through so the next screen shows through; carousel and orbit use small frames).
   - `BackdropLights`: hemisphere, key, fill and rim lights plus an optional centre light (`inside`) for room and sphere-of-screens.
2. **Recipe detection:** `planWorld` (pure, `world/plan.ts`) reads the choreography (camera start, layout, pinned section tracks) to work out the recipe, floor height, fog and frame size. Pass `recipe` to `World` or `ScreenFrame` to override.
3. **Why surfaces looked black:** three.js divides diffuse light by pi, so `BrandLights` at intensity 1 and 0.6 lights a surface to about a third of its colour, and ambient tinted with the dark `surface` colour multiplies dark by dark. `BackdropLights` multiplies every intensity by pi. `World` and `BackdropLights` also switch tone mapping off so ACES does not wash brand colours out. Materials also carry a small emissive share of their own colour, so a scene without lights is dim, not black.
4. **Text panel:** `HtmlLayer` styles each section's content box from CSS variables: `--toros-panel-bg`, `-text`, `-border`, `-radius`, `-padding`, `-shadow`, `-width`, `-align`. `TorosSite` fills them from the brand tokens when `brand` is given (surface background, text colour, accent border, centred) and `panel={false}` turns that off. Without a brand nothing changes. Text stays real HTML; ADR 004 and 005 rules are unchanged.
5. **Reduced motion:** frames live inside section groups, so the stage logic hides frames at weight 0 and fades the active one. World parts are outside the groups and stay put, so the floor and walls stay visible while only the first screen shows.
6. **Palette:** surfaces use brand tokens as they are (`brand/palette` stays quiet); only the sky gradient and fog are blended.

## Limits

- Neighbouring screens are only visible where the recipe puts them within the view: carousel, gallery (desktop), fly-through (through the see-through frame). In a room or sphere with four screens the next screen is 90 degrees away and out of view; pillars and wall bands show the curve instead.
- Brand colours at emissive 0.9 on the accent edge can read brighter than the token.
- Depth precision in software WebGL needs about 0.1 m between coplanar parts, so floor trims sit 0.12 above the floor.
- Reduced motion shows only the first screen at a time by design.
