# Reading the check report and repairing

## Run it

```
toros check http://localhost:5173 --json
```

Without `--json` you get a readable report. With `--json` (or MCP `check_site`) you get the `Report` object.

## Report fields

| Field       | Meaning                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `score`     | Overall 0 to 100.                                                                                                                        |
| `passed`    | `true` only when `score >= 90` AND no finding has severity `error`.                                                                      |
| `groups`    | Score per group: `load`+`render`, `scroll`, `nav`, `html`+`seo`, `a11y`, `budgets`, `brand`, `mascot`. Each has `score` and `weight`.    |
| `findings`  | One entry per failure: `rule`, `severity`, `viewport` (`desktop` or `phone`), optional `section`, `message`, `fix`, optional `evidence`. |
| `renderer`  | The WebGL renderer per viewport. Software renderers (CI) are why `load/webgl` can report info.                                           |
| `artifacts` | Files written, such as screenshots. Read them, never edit them.                                                                          |

Group weights: load+render 15, scroll 20, nav 10, html+seo 15, a11y 15, budgets 15, brand 5, mascot 5.

## Severities

| Severity | Effect on score                           | Effect on `passed`                               |
| -------- | ----------------------------------------- | ------------------------------------------------ |
| `error`  | A failing rule scores 0 for that viewport | Any error makes `passed` false, even at score 95 |
| `warn`   | Half credit                               | None on its own, but it lowers the score         |
| `info`   | No penalty                                | None                                             |

A rule is judged per viewport, so a failure on `phone` only still counts.

## Hard gates

If any of these fail with an error the overall score becomes **0**: `load/ready`, `render/not-blank`, `scroll/reaches-every-section`. Fix them first, always. Other findings are meaningless until the site loads and renders.

## Fix lines

Each finding carries a `Fix:` line written for you to act on. Follow it, but confirm against the source: it names the likely cause, not a guaranteed one.

## Repair loop

1. Run the full check. Record the score.
2. If `passed` is true, stop. Report the score.
3. Fix in this order: hard gates, then other errors, then warnings that cost points, until score >= 90.
   - Group findings by rule id and fix the root cause, since one cause often triggers several rules.
   - Start with `load/*`: a console error or missing bridge makes later rules unreliable.
4. Change source only (config, components, `index.html`, assets). Never edit reports or fixtures to make a rule pass.
5. Re-run only the changed rule with `--rule <id>` to iterate fast. Then re-run the **full** check.
6. If the score rises but errors remain, keep going. Score 100 with one error is still a fail.
7. If the same finding survives three honest attempts, stop and tell the user what is failing and what you tried. Do not disable the rule.
8. Never set an `allow` flag to silence a motion finding unless the user asked for that motion.

## Common fixes

| Symptom                                           | Likely fix                                                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load/ready` timeout                              | The bridge never set `window.__toros` or an asset failed to load. Check the console and asset paths. Off-localhost, set `"testMode": "always"` in `toros.json`. |
| `load/console-errors` with `invalid choreography` | The schema rejected your choreography and the default was used. Fix the field path named in the message.                                                        |
| `scroll/reaches-every-section`                    | A section has no beat or no DOM anchor. Add the missing `<Section id="...">` and a beat for every section id.                                                   |
| `scroll/no-jumps`                                 | Camera moves more than 1.5 m between scroll steps. Add keyframes, use `path: "curve"`, or shrink the distance between beats.                                    |
| `scroll/no-roll`                                  | Camera tilts sideways. Keep `lookAt` keys from forcing a roll, and avoid camera `rotation.z`.                                                                   |
| `budgets/*`                                       | Run `optimize_assets` on GLBs, merge meshes, use instancing, drop unused models.                                                                                |
| `html/section-text`                               | Add real HTML with a heading for each section.                                                                                                                  |
| `a11y/*`                                          | Add the nav overlay and stop swallowing key events.                                                                                                             |
