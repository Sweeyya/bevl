# Asset pack: assets first, then the site

Written 2026-11-23. Status: plan, nothing here is built yet.

## 1. The owner's workflow

When the owner designs a site, the assets come first: choose the colors, decide a small system for the kinds of assets the project needs, make all of them, put them in one folder, and only then build the site from that folder. Toros should follow the same order. Many users have no assets to give, so Toros must be able to make them.

The owner also does not want the typical AI look. In particular, no rounded corners.

## 2. The flow

1. **Intake.** Brand file, detailed prompt, or the few questions from `docs/plans/taste-and-intake.md`.
2. **Palette and system.** Colors and fonts come from the brand, or from a dealt art direction.
3. **Asset pack.** `toros assets generate` writes an `assets/` folder in the project and a manifest listing every asset.
4. **Site.** The agent builds the site only from what is in `assets/` (plus real text), the same way the owner does.
5. **Check.** Every asset is within budget and used, and the style rules hold.

The user can look at the folder, replace any file, and re-run the build. The pack is plain files they own.

## 3. Three ways to make assets, with a default that needs nothing installed

| Tier         | How                                                                                                                                          | Needs                                   | When                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| 0 (default)  | Code-generated: SVG for 2D, PNG textures, and 3D models built as GLB files with glTF Transform, plus procedural three.js geometry at runtime | Nothing beyond Toros                    | Always works                                                 |
| 1 (optional) | Blender, driven through a Blender MCP                                                                                                        | Blender installed and the MCP connected | Only if detected; richer models, sculpts and rigs            |
| 2            | The user's own files                                                                                                                         | Their folder                            | Always wins over generated assets; Toros only optimizes them |

Blender is never required. If it is not available Toros uses tier 0 without asking and without error. I have not checked how a Blender MCP is installed or what it can do; that needs to be looked at before tier 1 is built.

Why tier 0 can work without Blender: glTF Transform (already a dependency of `@toros/optimizer`) can build a model from plain arrays of positions and indices in Node, with no browser and no 3D application. PNG textures can be written with `pngjs` (already used in the repo), and SVG is text.

## 4. What the folder holds

```
assets/
  manifest.json      every asset: id, kind, source (generated | user | blender), size, where it is used
  palette/           palette.json and a swatch sheet
  type/              font stacks and an HTML specimen
  textures/          seamless PNGs: grain, paper, concrete, noise, gradients
  patterns/          SVG patterns and dividers
  icons/             SVG icons (square, no emoji)
  marks/             logo mark, favicon, share image
  models/            GLB props and set pieces
  backgrounds/       backdrops used behind the 3D scene
```

The exact kinds and the folder layout should match how the owner already organizes projects. I looked in the Downloads folder and found no web-design asset folders (only a checklist-bot project, a PDF table tool and homework), so the layout above is a guess until the owner shows an example or describes the system.

## 5. Style rules (no AI feel)

Each art direction carries these as data, and a check enforces them:

- **Sharp corners.** Border radius 0 on every generated element, panel, button and 3D frame. Today there are rounded corners in three places that must change: the contrast `Fix:` text suggests `border-radius: 0.5rem`, the nav links in `@toros/a11y` use `borderRadius: 4`, and the core brand default is `radiusBase: 4`.
- No pill buttons, no soft blurred blobs, no glass-card look, no emoji as icons, no three identical cards in a row, no purple or blue gradient backgrounds.
- A proposed rule `style/sharp-corners` (error) looks at the computed border radius of visible elements and fails the site if any is above 0. A second rule can flag the other items in the list above.

## 6. Commands and tools

- `toros assets generate --brief toros.brief.json [--seed <n>] [--kinds textures,patterns,icons,marks,models]` and `toros assets list|validate`.
- MCP tools `generate_assets` and `validate_assets`, with the same project-root guards as the other tools.
- Rules (each with a broken fixture): `assets/manifest-valid`, `assets/within-budget` (uses the existing texture and triangle budgets), `assets/unused` (warn), and `style/sharp-corners`.
- The skill tells the agent to generate the pack first, look at it, and build the site from it.

## 6b. Rights

The manifest has a required `rights` field for every asset that is not generated by Toros: `owner` (the user's own work), `licensed` (with the license or source named), or `unknown`. An asset marked `unknown` is a warning. A rule `assets/rights-declared` (warn) flags assets with no stated source or license, and the skill asks the user once whether they have the right to use what they supply. Toros does not verify ownership; the user is responsible (see `LEGAL.md`). Third-party generators (AI image or model tools) are named in the manifest so their terms can be checked.

## 7. Build order

1. Sharp-corner defaults everywhere, plus the `style/sharp-corners` rule.
2. Tier 0 generators (SVG, PNG, GLB) and the manifest, probably in a new `@toros/assets` package (record the decision in an ADR).
3. The CLI command, the MCP tool, and the asset rules.
4. `create` and the skill use the pack.
5. Tier 1: detect Blender and a Blender MCP, and use them when present.

## 8. Open questions

- What asset kinds does the owner always make, and how are the folders named?
- Which parts of the "AI look" should be banned besides rounded corners?
- Should generated models be simple on purpose (flat, geometric, sharp) so they match the no-rounded-corners rule?
