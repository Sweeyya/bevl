# Decisions log

Big decisions go in `docs/adr/`. This is a short running log.

| Date       | Decision                                                                                                                          | Reason                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-18 | Name: Doodley. npm `doodley` free; GitHub user `doodley` taken, so the repo is `Sweeyya/doodley`                                  | Checked npm and GitHub on this date                                                                                            |
| 2026-11-23 | Renamed Doodley to Bevl                                                                                                           | `@doodley/core` on npm belongs to someone else, so the scope was not ours                                                      |
| 2026-11-23 | Renamed Bevl to Toros                                                                                                             | The `bevl` npm scope was not available; `toros` was. Known overlap: Toros AI (toros-ai.com), a small web and automation agency |
| 2026-11-19 | Product plan is `PROJECT_PLAN.md` (brand → 3D website, scroll first). The older checker-first plan is archived in `docs/archive/` | Founder's plan; ships faster and is clearer                                                                                    |
| 2026-11-19 | Use React Three Fiber + drei. Test mode uses `frameloop="never"` + `advance()`                                                    | Popular for websites; R3F docs show manual frame control, which keeps tests repeatable                                         |
| 2026-11-19 | Add `@toros/check` package and 8 test layers (`TESTING.md`)                                                                       | "Every site comes tested": agents can see and fix problems                                                                     |
