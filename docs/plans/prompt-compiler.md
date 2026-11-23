# Plan: user answers to one strong prompt

Status: for later. Start Phases 1–2 whenever sites get built. Start Phases 3–5 once the MCP tools (`create_site`, `add_section`, `apply_brand`), choreography recipes and skill are done.

Goal: learn from real sessions what an AI needs to build a site the user likes, ask the user for all of it once, and compile it into one prompt tuned for the target AI.

## Phase 1: Record real sessions (3–5 sites)

For each site built with Claude or another AI, save:

- Raw prompts, in order, exactly as typed.
- What the AI asked and what it got wrong.
- Every correction ("darker", "camera too fast", "use my logo"). Each one is information the first prompt was missing.
- Outcome: final site, `toros check` score, number of turns, time, tokens if available.
- A 1–5 rating and a screenshot.

Keep transcripts out of the public repo (private or gitignored folder).

## Phase 2: Find out what the AI needed

Tag every piece of information by:

- Category: brand (colors, fonts, logo), content (section text), structure (sections), motion (how scrolling feels), mood and reference sites, devices, assets, constraints.
- When it showed up: up front, after the AI asked, or only through a correction.

Combine the sessions into a requirements checklist. Anything that only appeared through corrections goes into the intake.

## Phase 3: Design the intake

- Infer before asking: read the brand file, `DESIGN.md` or existing site; ask only for what is missing.
- Show choices instead of free text where possible (for motion, show the recipe gallery).
- Use defaults for low-stakes items.
- This answers the open item in `PROJECT_PLAN.md` §16: "The design questions the MCP asks users."

## Phase 4: Build the prompt compiler

- Mostly plain code: answers become a structured brief (JSON), templates turn the brief into a prompt. Use an LLM only for interpretation (for example, turning "dreamy, like floating in space" into a draft choreography).
- One adapter per target AI (Claude, ChatGPT, Cursor, Lovable). Decide adapter differences from Phase 5 measurements, not guesses.
- Every prompt includes the finish line: run `toros check`, fix every `Fix:` item, stop at 90+.

## Phase 5: Test the full run-through

Extends the golden tasks in `TESTING.md` §8.

- The 3–5 sites become golden tasks, with the intake answers as input.
- A/B test: original raw prompts vs the compiled prompt, on each target AI.
- Measure: check score, turns, corrections still needed, tokens and time, and a 1–5 rating against the site the user liked.
- Target: one prompt reaches 90+, needs at most 1 correction, and rates 4 or higher.
- Feed failures back into Phases 3 and 4, then rerun.

## Open questions

1. Build the sample sites with Toros, without it, or both? (Without gives a baseline.)
2. Which AI to tune for first?
3. Is the main user a non-technical person in a chat app or a developer in Cursor or Claude Code? This sets how many questions the intake can ask.
