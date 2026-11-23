# Roadmap and open decisions

Written 2026-11-23. This is the one place that lists what is done, what is next, what is waiting on a decision, and the ideas we talked about that are not built yet. The detailed plan is `PROJECT_PLAN.md`, the tests are in `TESTING.md`, and the prompt-compiler plan is `docs/plans/prompt-compiler.md`.

Anything marked **proposal** has not been agreed or built.

## 1. Where things stand

Built and merged: the scroll engine and recipes, inputs and snapping, the HTML text layer, brand tokens, reduced motion, 33 check rules with 29 broken fixtures, the CLI, the MCP server, the agent skill, the optimizer, and a CI that runs only the fast checks per PR (slow checks run on `main` and with the `full-ci` label).

Not built: the mascot package (empty), the effects palette (a scaffold only), RAG, the prompt compiler, any npm publishing, and a scaffold that makes a site look like a real room.

First real trial (an agent building a coffee roaster site from only the skill): it scored 100/100 but the scene looked flat, and six things slowed or blocked the agent (see section 3).

## 2. Decisions waiting on you

| Decision                           | Options                                                                                                    | Why it matters                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| How the runtime reaches a site     | A: publish `@toros/*` to npm. B: copy the runtime into each site. Mix: publish the tools, copy the runtime | A fresh site cannot install today, because nothing is on npm   |
| The `@toros` npm scope             | Create the organization on npmjs.com                                                                       | Scope ownership cannot be checked without logging in           |
| License                            | MIT, Apache-2.0, or other                                                                                  | There is no LICENSE file, so nobody may legally reuse the code |
| Dependabot                         | Keep or turn off                                                                                           | Its commits show `dependabot[bot]` as an author                |
| GitHub repo description and topics | Write them                                                                                                 | Both are empty today                                           |

## 3. Next up, in order

1. **Fix PR from the trial.** Brand fonts are silently dropped when written as `Headings:` and `Body:`. The brand file must be inside the project. `create` and `add-section` cannot produce a given section list in order. Readable `check` output hides the evidence. The contrast `Fix:` suggests black text. The skill needs a "gotchas" section and an instruction to open screenshots, not just trust the score. `create` should write `workspace:*` inside a workspace and a clear "not published yet" message otherwise.
2. **A scaffold that looks like a room** (design work): a lit wall, neighbouring screens visible, text on the screen. This is the largest gap between "passes" and "looks good".
3. **Re-run the trial** with a real agent.
4. **Distribution and first npm publish** (section 4).
5. **Training sessions and the prompt compiler** (section 5).

Taste, intake and quiet agents (the plan for brand-less prompts, house taste, auto-chosen scroll styles and agents that speak only at the end): `docs/plans/taste-and-intake.md`.

Asset pack (generate colours, textures, icons and models into a folder first, with three.js and glTF Transform as the default and Blender optional; sharp corners): `docs/plans/asset-pack.md`.

Between test sites (the prompt to paste, the session record JSON, and what to send back): `docs/plans/session-recap.md`.

## 4. Publishing to npm

How people would use it once published: the MCP server by adding `npx -y @toros/mcp` to their AI tool's settings, and the CLI with `npx @toros/cli check <url>`. A plain `npx toros` needs an unscoped package named `toros`, which is free on npm today. The skill is separate and is distributed as files from GitHub or skills.sh.

Steps (proposal, based on npm's documentation, read 2026-11-23):

1. Make an npm account and turn on two-factor authentication.
2. Create the `toros` organization on npmjs.com. If the name is taken, pick another scope before anything is published.
3. Finish the prerequisites: a license, `repository`, `files` and `publishConfig` in each package, and the distribution decision above.
4. **Publish each package once by hand** with `npm login` and `npm publish --access public`. npm's trusted publishing only works for packages that already exist, so the first version of every package must be published manually.
5. On npmjs.com, for each package, add a trusted publisher: GitHub Actions, repo `Sweeyya/bevl`, workflow `release.yml`. After that the Release workflow publishes with no stored token, with provenance.
6. Fix `RELEASING.md`. It currently describes both trusted publishing and a stored `NPM_TOKEN`, and those conflict.
7. Fill in `server.json` for the MCP Registry and list the skill on skills.sh.

I can prepare steps 3, 6 and 7. Steps 1, 2 and 4 need your npm login.

## 5. Training sessions and the prompt compiler

Plan: `docs/plans/prompt-compiler.md`. Build 3 to 5 sites with an AI while recording every prompt, question, correction, score and rating, then turn what was needed into one intake form and a compiled prompt per target AI.

You can start recording now. The recording phase does not depend on Toros being finished: build sites you like with any AI and keep the raw material. Runs that use Toros are more useful after the trial fix PR and the distribution decision, because today a site made outside this repo cannot install.

Per session, keep: the first prompt, every follow-up and correction, the final result, the check score if Toros was used, time and token use, a 1 to 5 rating, and screenshots. Keep the transcripts private.

## 6. RAG for style and brand interpretation (proposal, not built)

The idea: the agent should do exactly what you describe, in the style you want, without fine-tuning a model. Fine-tuning changes model weights and is the wrong tool for "match this look". RAG (retrieval-augmented generation) fits better: keep a library of reference designs and look them up at generation time.

Pieces:

1. **A reference library.** For each reference: screenshots or a short video, a plain description, tags (mood, layout, motion), and the choreography and brand tokens that reproduce it.
2. **Retrieval.** Start simple, with tags and keyword search over a folder in the repo. Add embeddings and a vector index only if the library grows past what search can handle.
3. **A brand-interpretation step.** The agent reads the brand file, retrieves the closest references and recipes, and proposes a choreography, layout and effects with the retrieved examples as context.
4. **Evaluation.** The golden tasks and the check score tell us whether retrieval helped.

Blocked on: your design references and inspiration. The effects palette waits on the same material.

## 7. Mascots and characters (V2, not built)

Today: `packages/mascot` is empty, the test bridge's `mascot()` returns nothing, and no `mascot/*` rule exists. The plan (`PROJECT_PLAN.md`, `TESTING.md` section 4.9) has two levels:

**Level 1, characters with no limbs (the plan's V2).** Bend, squash, bob and blink with shader deformers, no bones. Nothing to rig, so the only thing to test is behavior.

**Level 2, characters with limbs.** They need a skeleton and skin weights. Options found on 2026-11-23:

- Mixamo is free with an Adobe ID but handles two-legged humanoids only, and accepts FBX or OBJ, not GLB.
- Blender's Rigify gives a full control rig but you fit the skeleton to the mesh by hand.
- Meshy and Tripo auto-rig humanoids and four-legged characters inside their generators. Meshy's "Smart Rig" handles other shapes but exports GLB only and cannot use its animation library.
- Mesh2Motion is free, open source, runs in the browser and exports GLB with fixed skeleton types such as human, fox, bird and dragon.
- AI is getting good at placing bones. Skin weights still need a person to check, because bad weights show only when the model moves.

How to test a rig (proposal):

1. **Spec check.** Run the Khronos glTF-Validator on every character file. It catches skin joints that do not exist, broken accessors, and animation timing that does not increase.
2. **Content check.** Open-source tools exist that go beyond the spec: `animsmith` checks loop seams, NaN values and rotation errors in clips, and `rigcheck` plays every animation in a browser and measures torn or smeared meshes and missing heads. I have not tried either.
3. **Our own `mascot/*` rules** from `TESTING.md`: visible when it should be, idle motion changes the picture over 2 seconds, never covers text, barely moves under reduced motion. Each needs a broken fixture.
4. **Pose sampling in test mode:** step to fixed times, read the mascot's pose through the bridge, and require the same result every run and no extreme vertex movement.

Recommended order: Level 1 first, then Level 2 with a hand-made or Mesh2Motion character, and validate with the glTF-Validator and `rigcheck` before writing our own rules.

## 8. Effects palette

The glass material and shader background are scaffolds. The palette waits on your design references. Do not describe effects as finished until then.

## 9. Other backlog

- Enforce the 7-day dependency age in pnpm (`minimumReleaseAge`); 60 lockfile entries are currently newer.
- Run a security review of the MCP server and CLI with a strong model, using scanners first and the model to verify.
- Golden tasks (`TESTING.md` section 8) once the skill has been re-tried.
- The scrollbar follows the camera only in `scroll` input mode, not in wheel-only mode.
- Docs site, README GIF and sample report, MCP Registry and skills.sh listings, launch posts.
