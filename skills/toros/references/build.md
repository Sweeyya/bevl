# Build details

## Install

The `@toros/*` packages may not be published yet. Inside a pnpm workspace, set `"@toros/core": "workspace:*"` and `"@toros/a11y": "workspace:*"` in the site's `package.json` before `pnpm install`. If install fails with a 404 for an `@toros` package, that is the cause.

## Dev server and ports

Start it with an explicit free port and `--strictPort`, for example `pnpm dev --port 4420 --strictPort`. Use the same URL for `check` and `shots`. Run it in the background and stop it when you are done. `check` takes 20 to 60 seconds and prints nothing meanwhile.

## Brand

- The brand file must be inside the project folder. Copy it in first.
- Font lines: `- Headings: Georgia, serif`, `- Body: Inter, sans-serif`. Check `src/brand.tokens.json` afterwards.
- `BrandMaterial` and `BrandLights` colour the scene from the tokens. Valid `role` values: `primary`, `secondary`, `surface`, `accent`. Example: `<BrandMaterial role="accent" />`. Never hard-code colours that contradict the brand.
- A very dark `surface` stays almost black unless the scene has light. Add `BrandLights` or lights of your own, then check the shots.

## Where choreography lives

`toros.json` holds the site name, sections, brand file and `choreography`. `toros recipe apply <name>` writes the choreography there. The site's `App.tsx` must pass it on: `config={{ ...config, choreography }}`. If your scene ignores your choreography, this is the first thing to check. An invalid choreography is reported as a console error and the default fly-through is used, so run `check` after every edit.

## Text on screens

Section `html` is an overlay on the page, not an object in the 3D scene. It fills the viewport, shows one section at a time, is centred vertically and sits at the left with padding. It does not follow a 3D screen. Children of `<Section>` are local to that section's spot in the layout.

To keep text readable over bright or busy 3D, wrap it in a backing panel with a solid brand colour:

```tsx
html={<div style={{ background: "#1b1410", color: "#fff", padding: "1.5rem", borderRadius: 12, maxWidth: "28rem" }}><h2>Title</h2><p>Short copy.</p></div>}
```

Do not fix contrast by turning text black if that breaks the brand; use the panel. On phones the panel should still fit the width.

## Scene dressing (note)

`World`, `ScreenFrame` and `BackdropLights` from `@toros/core` give a lit room with framed screens and visible neighbours. Use them if they exist in the installed version; otherwise build the room from meshes and lights.
