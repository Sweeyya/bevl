---

name: toros
description: Builds branded, fast, accessible scroll-driven 3D websites and verifies them with the Toros checker. Use when the user wants a 3D website, a 3D landing page, a scroll-driven or scroll-animated 3D experience, a branded 3D site from a brand kit, DESIGN.md or design tokens, or describes camera and scroll motion (fly-through, carousel, sphere of screens, room). Also use when asked to check, score, repair or optimize a Toros site or its GLB assets.
license: MIT
compatibility: Needs Node 22+, pnpm, and Chromium for the checker. Works with the Toros MCP server or the toros CLI. Claude Code, Cursor, Codex, Lovable and other Agent Skills clients.
metadata:
version: "1"
---

# Toros

# Toros

Toros makes a scroll-driven 3D website from a brand. One `progress` value from 0 to 1 drives the whole scene. `toros check` tests the site in a real browser and returns a score from 0 to 100.

**Work quietly. Speak once, at the end.** Do not tell the user about errors, fixes, retries or tool output while you work. The user wants the finished site.

## When to use

A 3D website or landing page, a scroll-driven 3D experience, a site from a brand kit, `DESIGN.md` or design tokens, a described scroll feel ("fly through", "inside a ring of screens"), or checking, repairing or shrinking an existing Toros site or `.glb`.

Not for: plain 2D pages, dashboards, forms, games or free-roam worlds, 3D modelling, or sites that must work without WebGL.

## The steps

1. **Intake** (below). Save the brief.
2. **Pick the look and the scroll style** (below).
3. **Build.** `toros create <name> --sections "Welcome,Our Beans,Visit Us,Contact"` (this sets the section list and order; without it you get template sections). Insert later with `toros add-section <id> <title> --after <id>`. Apply the brand, write the real copy into each section, then see [references/build.md](references/build.md) for the details that trip people up.
4. **The quiet loop.** Run the dev server, run `toros check <url> --json`, fix every `Fix:` item in the source, run again. Repeat until the score is at least 90 with zero errors. **Stop after 6 rounds** and report what remains, once. A full run takes 20 to 60 seconds; wait for it. Details: [references/repair-loop.md](references/repair-loop.md).
5. **Look at it.** A score of 100 does not mean it looks good. Run `toros shots <url> --viewport both`, then open the PNG files (the contact sheet first, if there is one) and compare them with the brief. Fix anything flat, empty, too dark, cut off, or hard to read: add light, brand colours, a backing panel behind text, or visible neighbouring screens. Then run `check` again. Never skip this step.
6. **Final message.** Only this, in plain words:
   - What you built, in one or two sentences.
   - How to open it: the exact command and URL (for example `pnpm dev --port 4420`, then http://localhost:4420).
   - The check score, and that there are no errors. If something remains, say what, once.
   - The 3 or 4 main design choices: art direction, scroll style, brand colours and fonts.
   - 2 or 3 things the user can ask to change.

   No lists of errors, no tool names, no step-by-step history.

## Intake

Never ask about what you were already given.

- **A brand file or design system is given:** use it. Do not ask about colours or fonts. Copy the file into the project folder first (tools refuse paths outside it), then `toros apply-brand <file>`. In a `DESIGN.md`, write fonts as one line each: `- Headings: Georgia, serif` and `- Body: Inter, sans-serif`, and colours as hex values next to a role word (`- Primary: #1b4332`). Preview the result with MCP `read_brand_tokens` and read `src/brand.tokens.json` before building; if a font or colour came out as a default, fix the file and apply again.
- **A detailed prompt:** extract a brief (purpose, audience, tone, sections and copy, devices, avoid-list). Ask only about gaps that would change the result.
- **Neither:** ask at most five short questions in one message, each with options and a "choose for me" answer: (1) what the site is for and who it is for; (2) three mood words, or one of six looks; (3) colours: given, "match my logo", or choose for me; (4) sections and any copy; (5) what to avoid. Then continue without asking more.

Save the brief as `toros.brief.json` in the project and run `toros brief validate toros.brief.json` (MCP `validate_brief`). Fix what it reports. Fields: `version` 1, `name`, `kind` (landing, product, portfolio, gallery, story, venue, saas, event, other), `purpose`, `audience`, `tone` (words), `sections` (`{id,title,copy?}`), `colors` (`given`, `match-logo`, `choose`), `avoid`.

## Look and scroll style

- **No brand given:** run `toros taste deal --brief toros.brief.json --apply` (MCP `deal_art_direction`). It picks an art direction, writes it into the brief and writes `src/brand.tokens.json`. Use it as dealt. Do not invent a palette or fall back to default grey and white. `toros taste list` shows the options.
- **Look to aim for:** run `toros reference search --kind <kind> --tone dark,atmospheric` (MCP `search_references`) and adopt the top match's archetype, render style, palette, camera, assets and needs as the starting point. It lists what Toros can build from code and what needs outside assets (photos, illustration), so you do not promise what it cannot make.
- **Scroll style:** run `toros recipe recommend --kind <kind> --sections <n> [--tone calm,warm]` (MCP `recommend_recipe`), then `toros recipe apply <name>` (MCP `apply_recipe`). The user never needs to know the style names; describe the result in plain words ("the camera glides forward through the sections").
- **Close call:** build two candidates, take `toros shots` of each, keep the one that looks better against the brief.
- If the user described a scroll feel themselves, write that choreography by hand instead: [references/choreography.md](references/choreography.md).

## Tools

CLI (MCP tool in brackets). Run `toros <command> --help` for flags.

| Command                                                                                              | Purpose                                           |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `toros create <name> [--sections "A,B"] [-d <dir>]` (`create_site`)                                  | New site                                          |
| `toros add-section <id> <title> [--after <id>]` (`add_section`)                                      | Add a section                                     |
| `toros apply-brand <file>` (`apply_brand`)                                                           | Apply brand file; `read_brand_tokens` previews it |
| `toros brief validate <file>` (`validate_brief`)                                                     | Check the brief                                   |
| `toros taste list` / `toros taste deal --brief <file> [--seed <n>] [--apply]` (`deal_art_direction`) | Art directions                                    |
| `toros recipe list` / `recommend` / `apply <name>` (`recommend_recipe`, `apply_recipe`)              | Scroll styles                                     |
| `toros reference list` / `show <id>` / `search` (`search_references`)                                | Reference looks and what each needs               |
| `toros check <url> [--project-dir <dir>] [--json] [--rule <id>]` (`check_site`)                      | Score a running site                              |
| `toros shots <url> [--out <dir>] [--viewport desktop\|phone\|both]` (`capture_shots`)                | Screenshots of every screen                       |
| `toros optimize <file.glb>` (`optimize_assets`)                                                      | Shrink a GLB                                      |

Exit codes of `check`: 0 passed, 1 issues found, 2 bad usage, 3 environment problem (browser missing, port busy). Code 3 is not a site fault; fix the environment and re-run.

Use `--rule <id>` only to iterate faster; the final run must be the full check. Always use `--json` when you need detail (message, evidence, which section).

EOF
cat /tmp/choreo.md >> SKILL.md
cat /tmp/rest.md >> SKILL.md
cat >> SKILL.md <<'E'

## Reference files

- [references/build.md](references/build.md): install, ports, brand roles, text on screens, where choreography lives.
- [references/repair-loop.md](references/repair-loop.md): reading a report, the repair loop.
- [references/choreography.md](references/choreography.md): turning a described scroll feel into data.
- [references/rules.md](references/rules.md): every checker rule and its usual fix.
