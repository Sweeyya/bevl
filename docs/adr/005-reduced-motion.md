# ADR 005: Reduced motion

## Status

Accepted. Replaces point 5 of ADR 004 (instant switching).

## Context

Design rule 6 says reduced motion gives soft fades. Until now only snapping and nav jumps were instant and the HTML layer skipped its slide; the camera still flew the whole path, which is what makes people dizzy.

## Decision

1. **One preference:** `prefersReducedMotion()` and `useReducedMotion()` in `@doodley/core` (`prefers-reduced-motion: reduce`, live through matchMedia change events, false without a window). `DoodleySite` reads it once and shares it through `DoodleyContext.reducedMotion`. `@doodley/a11y` re-exports the core hook.
2. **Default ("fade"):** with the preference on, the camera stays at its progress-0 pose (fov included) and camera tracks do not run. Every section group moves to the first section's placement and is faded by `sectionVisibility` (the weights the HTML layer uses): material opacity follows the weight, and a group at weight 0 is `visible = false`. Object tracks and behaviors do not run. Progress, scroll, keyboard, nav links and snapping work as before (jumps are instant). The HTML layer fades without the slide. Turning the preference off at runtime restores positions, visibility and material opacity.
3. **Override:** optional `reducedMotion: { mode?, tracks?, behaviors? }` on the choreography. `tracks` run in addition to the stage behavior; camera tracks in the list replace the frozen start pose. `behaviors` names registered behaviors that may keep running. `mode: "none"` keeps the full choreography and needs `allow.reducedMotion`.
4. **Check:** `a11y/reduced-motion` (error) sweeps normally, emulates `prefers-reduced-motion`, sweeps again and requires camera travel (metres plus radians) under 10% of normal, every section to become active, and the keyboard to reach every beat. `scroll/motion-allowances` reports `mode: "none"` as info. The bridge has `motion()` returning `{ reducedMotion }`.

## Trade-offs

- Materials shared between sections fade together, because opacity is written per material. Give each section its own material if you need independent fades.
- Sections are staged on the first section's spot, so a scene whose first section is not in front of the start camera pose will show an empty stage. Recipes satisfy this; custom choreographies should keep section 1 in view at progress 0.
- Transparent materials can sort differently while fading; the original `transparent` flag is restored afterwards.
