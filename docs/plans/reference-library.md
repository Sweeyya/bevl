# Reference library: what Claude needs to build looks like these

Written 2026-11-23. Status: the library and its search are built (`toros reference list|show|search`, MCP `search_references`). Most of the capabilities the references need are not built yet.

## 1. Why this exists

The owner collects reels of 3D websites and wants Toros to build sites like them without Claude working out the look alone. For that, Claude has to be able to turn "dark, atmospheric, a shrine" into a concrete plan: which assets to make, which effects to use, how the camera moves, how the text looks. Each reference is a worked example of that plan. This is also the data the later retrieval (RAG) step searches.

## 2. What Claude needs to know to build one of these

1. **A vocabulary.** Each reference is described the same way: archetype, render style, camera pattern, mood words, palette, typography, motion, interaction.
2. **What can be made from code.** Toros makes geometry, textures, SVG, particles, lighting and shaders itself. Illustration, photos and video come from the user, stock, or a generator, with the source and license recorded in the asset manifest (`docs/plans/asset-pack.md`).
3. **What Toros can already do and what is missing.** Every entry lists the capabilities it needs with a status (`exists`, `partial`, `missing`), so an agent does not promise something that is not built.
4. **Rules that encode taste.** Sharp corners, a small palette, a clear type scale, budgets with a fallback for heavy looks.
5. **A way to check the result.** Build from the reference's brief, run `toros shots`, and compare the screens with the reference.

## 3. The eight references

Described from sampled video frames (the reels themselves are other people's work and are not stored in the repository, only these descriptions). Palettes are approximate.

| Id                      | Look                                                            | Feasibility                        | Priority  | What the owner likes                                      |
| ----------------------- | --------------------------------------------------------------- | ---------------------------------- | --------- | --------------------------------------------------------- |
| `dark-japanese-shrine`  | Red moon, shrine, petals, fog, huge cropped type, chapter index | code only                          | **first** | Atmosphere, typography, chapter navigation, scene objects |
| `white-gallery-hall`    | Bright hall with framed work, a camera that glides              | code only                          | **first** | Gliding motion, showing work                              |
| `product-can-studio`    | Glossy cans in a dark studio, scene recolours per flavour       | code only                          | **first** | Flavour switching, studio lighting                        |
| `retro-device-screen`   | A machine whose scanline screen holds the site                  | code only                          | **first** | The machine as the interface, CRT screen, playfulness     |
| `glass-and-light-rings` | Glass droplet and orbiting light rings                          | code only                          | later     | Everything: glass, light, premium feel, subtle motion     |
| `pixel-art-3d`          | 3D scene drawn as pixel art, orbitable                          | code only (splats optional)        | later     | Orbit and interaction, retro mood                         |
| `ink-halftone-world`    | Red, black and white illustrated world with wipes               | partly (the drawings need artwork) | later     | Camera and scroll, illustrated objects                    |
| `photoreal-city`        | Cinematic scroll through a real-looking city and interior       | needs outside assets               | later     | Realistic imagery, camera and scroll, calm mood           |

## 4. What the owner's answers say about taste

- **Motion and mood carry the taste.** Camera and scroll motion, atmosphere, a strong mood (retro, calm, premium, playful) and interaction came up far more than anything else.
- **Typography matters in one reference only** (the dark Japanese one). Giant lettering is not a default Toros should reach for.
- **Scenes that change per section** (flavours, chapters) and **objects that respond to the viewer** (poking buttons, orbiting) are liked. A section should be able to change the look of the scene, not only move the camera.
- **Realism is liked in one place only** (the city). Stylised worlds with a strong point of view are the main direction.

## 5. What this means for the build order

The first four references together cover: world building (the hall), a product scene (the cans), atmosphere and particles (the shrine), and an interactive object (the machine). The capabilities they need, most important first:

1. Per-section scene changes (recolour, swap props) driven by the choreography.
2. Bloom and glow, instanced particles, fog tuning.
3. A lathe-turned product generator with labels drawn from SVG or canvas.
4. A CRT and scanline shader, and a way to align real HTML text with a 3D screen.
5. Interactive 3D objects (hover and press) that stay keyboard accessible.
6. Giant, vertical and cropped type treatments, still as real HTML.
7. A styled chapter index navigation.

The render-style packs (pixel, halftone, CRT, glass) belong in `@toros/effects`, which is currently a scaffold. These references are the design input that package was waiting for.

## 6. How a reference is added

Today the owner sends a link or screen recording and says what they like about it, and the builder views frames, writes the entry in `packages/tokens/src/references/entries.ts`, and records the owner's likes. Next step: `toros reference add <video>` extracts frames and the palette automatically and drafts the entry for the owner to correct. Do not commit other people's frames or screenshots; commit only the written description.

Each entry has: id, title, source credit, summary, archetype, render style, camera pattern, mood words, palette, typography, motion, interaction, assets (from code or external), needs (with status), what the owner liked, feasibility, priority, suggested site kinds and a suggested scroll style.

## 7. Search today and later

`toros reference search --kind portfolio --tone clean,bright` scores entries by site kind (3), archetype (3), matching mood words (2 each) and free-text word matches (1 each, up to 4), and breaks ties by id, so results are deterministic. It is plain tag and keyword matching on purpose. Embeddings can be added once there are enough entries (the target is 20 to 30) for tags to stop being enough.

## 8. Next steps

1. Build the first four: the gallery hall and the product cans first (closest to what exists), then the shrine and the machine.
2. Fill `@toros/effects` with the render-style packs these need.
3. Add `toros reference add <video>`.
4. Add more references (a spread across archetypes, plus the owner's own past sites).
5. Turn each entry into a test: build from its brief, take `toros shots`, and compare with the reference frames.

## 9. Open questions

- Which four should be built first? The list above is a suggestion based on what the owner liked and what is closest to built.
- Should a section be able to swap props and colours, or only recolour the scene?
- How strict should palette limits be (for example a small fixed palette per reference look)?
