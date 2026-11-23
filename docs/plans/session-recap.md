# Session recap: what to do between each test site

Written 2026-11-23. This is the routine for the test sites the owner builds with an AI to find out what works and what does not. After each one, the owner pastes one prompt into the same AI conversation, saves what comes back, and gives it to Toros's builder. The goal is to learn, from what was actually said, which questions were really needed, so people using Toros later are asked fewer of them. It is the recording step (Phase 1 and 2) of `docs/plans/prompt-compiler.md`.

## 1. Do we have a JSON format for everything we fill in?

Partly.

| What                                                                                                                                              | Where it lives today                                                                            | Status                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| The brief: name, kind of site, purpose, audience, mood words, sections and copy, colour preference, things to avoid, dealt art direction, history | `toros.brief.json`, checked by `toros brief validate` (`packages/tokens/src/taste/brief.ts`)    | Built                              |
| Colours, fonts, corner radius                                                                                                                     | `src/brand.tokens.json`                                                                         | Built                              |
| Sections and the scroll style                                                                                                                     | `toros.json` (`sections`, `choreography`)                                                       | Built                              |
| References, devices, assets, motion preference, constraints                                                                                       | Not in the brief yet. The brief rejects unknown keys, so these need a new version of the schema | Not built                          |
| A record of one test session (everything below)                                                                                                   | Section 4 of this document                                                                      | Defined here, not enforced by code |

The session record in section 4 is a superset: it holds the brief fields plus everything the AI asked, assumed and got corrected on. Once a few records exist, the missing brief fields (references, devices, assets, motion, constraints) can be added to the schema based on what the sessions actually needed.

## 2. Between each test

1. Before you start, write down the time and which AI and model you are using.
2. Build the site as you normally would. Do not edit the conversation afterwards.
3. When you are done (or when you stop), paste the recap prompt (section 3) as the **last message in the same conversation**.
4. Save the answer as `sessions/<date>-<short-name>-<tool>/recap.json`. The `sessions/` folder is ignored by git, because conversations can contain private details and this repository is public.
5. In the saved file, fill in `session.rating` (1 to 5), `session.minutes` and `outcome.humanNotes` yourself. The AI cannot know them.
6. If the site was made with Toros, also save the output of `toros check <url> --json` as `check.json` and `toros shots` as a `shots/` folder in the same session folder.
7. Give the session folder (or paste `recap.json`) to Toros's builder. I will read it, list what the first prompt was missing, and update the intake questions and the taste library.

## 3. The prompt to paste

Copy everything inside the block.

```text
Stop building. Do not change, create or delete any files, and do not run any commands. I need a record of this entire conversation so I can study it. Be exact. Do not summarise my words and do not clean them up.

Reply with ONE JSON object in a single code block, followed by nothing else. Use this shape. Use null for anything you do not know, and never invent facts. If something is not in the conversation, say null.

{
  "recordVersion": 1,
  "session": {
    "tool": "<the product or app you are, e.g. Claude, ChatGPT, Cursor, Lovable>",
    "model": "<the model name if you know it, else null>",
    "usedToros": <true or false>,
    "rating": null,
    "minutes": null
  },
  "firstPrompt": "<my very first message, copied word for word>",
  "userMessages": [
    { "n": 1, "text": "<my message, copied word for word>", "kind": "request | answer | correction | edit | other" }
  ],
  "questionsAsked": [
    {
      "n": 1,
      "question": "<your question, copied word for word>",
      "options": ["<options you offered, if any>"],
      "userAnswer": "<my answer, word for word, or null if I did not answer>",
      "category": "brand | content | structure | motion | references | devices | assets | constraints | other",
      "neededOrInferable": "needed | could-have-been-inferred | not-needed"
    }
  ],
  "assumptionsMade": [
    { "what": "<something you decided without asking>", "category": "<same categories>", "laterCorrected": true }
  ],
  "corrections": [
    { "userSaid": "<what I asked you to change, word for word>", "whatWasWrong": "<one sentence>", "category": "<same categories>" }
  ],
  "brief": {
    "name": null,
    "kind": "landing | product | portfolio | gallery | story | venue | saas | event | other",
    "purpose": null,
    "audience": null,
    "tone": [],
    "sections": [ { "id": "", "title": "", "copy": null } ],
    "colors": "given | match-logo | choose",
    "avoid": []
  },
  "design": {
    "palette": { "background": null, "surface": null, "text": null, "primary": null, "secondary": null, "accent": null },
    "fonts": { "heading": null, "body": null },
    "scrollStyle": null,
    "assets": [],
    "references": [],
    "devices": [],
    "constraints": []
  },
  "missingFromFirstPrompt": [
    "<each piece of information you needed that my first message did not contain, most important first>"
  ],
  "outcome": {
    "whatWasBuilt": "<two sentences>",
    "openIssues": ["<anything you know is unfinished or wrong>"]
  }
}

Rules:
- "userMessages" must contain EVERY message I sent, in order, copied exactly. "questionsAsked" must contain EVERY question you asked me, in order, copied exactly.
- If the conversation is too long to fit, output as much as fits, stop, and end with the single line: CONTINUE FROM userMessages n=<number>. I will reply "continue" and you carry on with the same JSON shape for the remaining items only.
- Replace any API key, password, email address or phone number with "[redacted]".
- Leave "rating" and "minutes" as null. I fill them in.
```

## 4. What each field is for

| Field                                                                     | What I learn from it                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `firstPrompt` and `missingFromFirstPrompt`                                | The information a user should be asked for up front, in order of how much it mattered                   |
| `questionsAsked` with `neededOrInferable`                                 | Which questions to keep, which to answer ourselves from a brand file or the prompt, and which to remove |
| `assumptionsMade` and `corrections`                                       | What the AI guessed wrong, so the taste library and defaults can be fixed                               |
| `brief` and `design`                                                      | The finished answers in Toros's own format, ready to become test briefs                                 |
| `session.rating`, `minutes`, `outcome.humanNotes` (the owner fills these) | Which kinds of sessions were good, and what a good result cost                                          |

## 5. After a few sessions

With 3 to 5 records, the builder will:

1. Count which categories were asked most and which answers were already in the first prompt.
2. Rank the questions that were truly needed (the intake ladder in `docs/plans/taste-and-intake.md` becomes evidence-based).
3. Extend the brief schema with the fields the sessions needed (references, devices, assets, motion, constraints).
4. Turn the records into test briefs that run through `toros taste deal` and `toros recipe recommend`, to see whether Toros makes the same choices without asking.

## 6. Privacy

Session folders are never committed. `sessions/` is in `.gitignore`. Before pasting a record anywhere public, read it once for names, emails and anything the client has not agreed to share.
