// Rule: scroll/snap-settles
// Pass: after the user stops between two beats, progress comes to rest on a beat
import {
  BEAT_EPSILON,
  beatAnchors,
  choreography,
  finding,
  onBeat,
  scrollTo,
  step,
  waitReady,
} from "../../drive.js";
import type { Rule } from "../../rule.js";

const SETTLE_FRAMES = 20;
const FRACTION = 0.3;

const rule: Rule = {
  id: "scroll/snap-settles",
  group: "scroll",
  severity: "warn",
  description: "Progress must come to rest on a beat after the user stops scrolling.",
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const beats = await beatAnchors(ctx.page);
    const flags = ((await choreography(ctx.page)) as { beats?: Array<{ snap?: boolean }> }).beats;
    const stuck: string[] = [];
    for (let i = 0; i < beats.length - 1; i++) {
      const from = beats[i] ?? 0;
      const to = beats[i + 1] ?? 1;
      if (flags?.[i]?.snap === false || flags?.[i + 1]?.snap === false) continue;
      await scrollTo(ctx.page, from);
      await step(ctx.page, SETTLE_FRAMES);
      const probe = from + (to - from) * FRACTION;
      await scrollTo(ctx.page, probe);
      await step(ctx.page, SETTLE_FRAMES);
      const rest = await ctx.page.evaluate(() =>
        (window as unknown as { __doodley: { scroll(): number } }).__doodley.scroll(),
      );
      if (!onBeat(beats, rest)) stuck.push(`${i}->${i + 1} rested at ${rest.toFixed(3)}`);
    }
    if (stuck.length === 0) return [];
    return [
      finding(
        ctx,
        "scroll/snap-settles",
        "warn",
        `Progress did not settle on a beat on ${ctx.viewport.name}: ${stuck.join("; ")} (tolerance ${BEAT_EPSILON}).`,
        'Fix: remove snap: { mode: "none" } from the choreography so progress settles on a beat. If you meant to opt out of snapping, set per-beat snap: false or accept this warning.',
        { stuck },
      ),
    ];
  },
};

export default rule;
