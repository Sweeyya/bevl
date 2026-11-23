# Taste, intake and quiet agents

Written 2026-11-23. Status: plan, nothing here is built yet. It records what the owner asked for, what other tools do (read on the same date), and the order to build it in.

## 1. What the owner asked for

1. A user may not have a brand file. Toros needs its own taste for that case, not an empty or default look.
2. A user may write a very detailed prompt. Toros must use all of it and not ask for what it already has.
3. A user may not know the different ways a 3D world can be shown. Toros (or the agent, by trying options) picks a good one.
4. When there is no brand file and no design system, the agent asks the user more questions first.
5. The agent does not report errors while it works. It speaks once, at the end, with the finished product. The user then asks for edits.

## 2. What other tools do

**Anthropic's `frontend-design` skill** (anthropics/skills, one file). Before any code, commit to a bold art direction, grounded in the brief's subject. Pick typefaces on purpose and avoid the usual defaults. Compare the plan to the generic default for that kind of page. Critique your own screenshots. It names the common "AI default" looks to avoid. It has no tools and no checks.

**Taste Skill 2.5** (Leonxlnx, MIT, about 111K stars). It sorts the project by kind of business, then "deals" a palette, a font pairing and a hero layout from curated libraries, and keeps a history so pages do not repeat. A script checks the page in headless Chrome at four widths against more than 100 rules.

**Impeccable** (pbakaus, Apache 2.0, about 104K stars). 24 commands (such as `bolder`, `quieter`, `critique`, `polish`) and a detector with 62 rules that runs without a model, including in CI.

**UI UX Pro Max** (nextlevelbuilder, MIT, about 146K stars). A searchable database: 80 styles, 74 font pairings and many palettes, plus guidance for 22 stacks. You describe the product and it returns a style, palette, fonts and anti-patterns, and can save the result as a design-system file.

**awesome-design-md** (VoltAgent, MIT, about 128K stars). Ready-made `DESIGN.md` files extracted from well-known brand sites, in the nine-section format that Google Stitch introduced. Each file ends with an agent prompt guide. These are other companies' looks, so they suit reference and learning, not shipping.

**Lovable.** It has no official open-source builder or CLI that I found. Its public pieces are the original `gpt-engineer` (an open-source command-line tool that asks clarifying questions, then writes the codebase), an official MCP server, plugins for Claude and Cursor, and a few small repositories. A third-party CLI called `lovagentic` drives it from a terminal. Its engineering post (Nov 4, 2026) has lessons we can use:

- Narrow the problem: new projects only, one opinionated stack, no stack selector.
- Match the agent's freedom to what the model can do reliably. They deleted most of their open-ended agent code once, because free-roaming agents got stuck.
- They planned to fine-tune models and found "knowledge files plus RAG" worked better: short notes about recurring mistakes, retrieved and added to the model's context. This supports our decision to use retrieval and not fine-tuning.
- A questions tool (the agent asks follow-ups when the prompt is vague), a Plan mode, and a Build mode that tests the app in its own browser and fixes what it finds.
- When a build fails the user presses "Try to fix", so the errors are visible to the user. Our goal is better: no visible errors at all.

**Bolt.new** (stackblitz, MIT, about 16.6K stars) is fully open source, including its system prompt, and gives the AI control of the whole environment.

## 3. Proposed design

### 3.1 Intake: what the agent does with what it is given

| The user gives                | The agent does                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A brand file or design system | Uses it. Does not ask about colors or fonts                                                                                                             |
| A detailed prompt             | Extracts a structured brief (purpose, audience, tone, sections and copy, devices, references, constraints). Asks only about gaps that change the result |
| Neither                       | Asks at most five short questions, each with options and a "choose for me" answer                                                                       |

The five questions, in order: what is this site for and who is it for; three mood words or a choice among six looks; colors (given, "match my logo", or "choose for me"); the sections and any copy they already have; anything to avoid. All answers are saved to the project, so later edits stay consistent (the same idea as Lovable's knowledge files).

### 3.2 House taste

A **taste library** shipped with Toros as plain files: about six art directions at first. Each one is a palette, a font pairing, material and lighting moods, a recommended scroll style, a motion personality, and a short "do and avoid" list. The agent is dealt one from the brief (not left to choose freely), and the history prevents two sites from looking alike. This is the same library RAG will later search, so building it as data now is not wasted work. It must avoid the flat result of the first trial: a lit scene, visible neighbouring screens and text placed on the screen.

### 3.3 Choosing the 3D experience

A decision table maps the brief to a recipe: a story or landing page to `fly-through`, one hero product to `orbit-product`, a portfolio or gallery to `horizontal-gallery`, many equal items to `carousel`, a cozy or immersive brand to `room`, and an abstract or playful brand to `sphere-of-screens`. For a close call the agent builds two or three candidates, takes screenshots at every screen in test mode (deterministic), and keeps the best by check score and its own critique. This needs a new command, `toros shots`, which captures every beat on desktop and phone so the agent can look.

### 3.4 Quiet agent

The skill and the MCP tool descriptions say: run `check`, fix every `Fix:` item, repeat up to a set number of rounds, and do not narrate errors. The final message contains only what was built, how to open it, the score, the three or four main design choices, and what the user can ask to change. If something could not be fixed after the rounds, it says that plainly, once. `toros check` gets a short machine-readable summary meant for that final message.

### 3.5 Guarding against flat results

Candidates for new checks, each needing its own broken fixture: a scene using only default grays and white with no brand tokens; text and 3D content that occupy too little of the viewport; the same palette repeated across candidates. These are proposals and may not all be worth building.

## 4. Build order

1. The fix PR from the trial (fonts, section list and order, readable `check` output, contrast fix text, install message).
2. `toros shots`, and a skill update: the quiet loop, the final-message format, and the intake ladder.
3. The brief file (`toros.brief.json`) and the taste library v1.
4. Recipe auto-selection and candidate comparison.
5. A scaffold that looks like a room.
6. Retrieval over a reference library, once the owner's design references exist.

## 5. Open questions

- Which looks should the first six art directions cover?
- Should the agent ever show a plan before building? The owner prefers no, so it should only do so when the user asks.
- How many repair rounds are acceptable before the agent stops and says what is left?
