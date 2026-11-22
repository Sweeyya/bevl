// Rule: nav/buttons-work
// Pass: every button and in-page link in a nav changes progress, the hash or the DOM when clicked
import { progress, scrollTo, step, waitReady } from "../../drive.js";
import { listNavControls, NAV_CONTROLS } from "../../nav.js";
import type { Rule } from "../../rule.js";

type Probe = { mutations: number; hash: string; observer: MutationObserver };

const rule: Rule = {
  id: "nav/buttons-work",
  group: "nav",
  severity: "error",
  description: "Every nav button and link must do something when clicked.",
  async run(ctx) {
    const { page, viewport } = ctx;
    if (!(await waitReady(page))) return [];
    const controls = (await listNavControls(page)).filter(
      (c) => c.visible && (c.tag === "button" || c.href === null || c.href.startsWith("#")),
    );
    const dead: string[] = [];

    for (const control of controls) {
      let responded = false;
      for (const start of [0, 1]) {
        await scrollTo(page, start);
        await step(page, 5);
        const p0 = await progress(page);
        await page.evaluate(() => {
          const w = window as unknown as { __navProbe?: Probe };
          w.__navProbe?.observer.disconnect();
          const probe = { mutations: 0, hash: location.hash } as Probe;
          probe.observer = new MutationObserver((r) => {
            probe.mutations += r.length;
          });
          probe.observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
          });
          w.__navProbe = probe;
        });
        await page
          .locator(NAV_CONTROLS)
          .nth(control.index)
          .click({ timeout: 3000 })
          .catch(() => undefined);
        await step(page, 2);
        const p1 = await progress(page);
        responded = await page.evaluate(() => {
          const probe = (window as unknown as { __navProbe: Probe }).__navProbe;
          probe.mutations += probe.observer.takeRecords().length;
          probe.observer.disconnect();
          return probe.mutations > 0 || probe.hash !== location.hash;
        });
        if (responded || Math.abs(p1 - p0) > 1e-3) {
          responded = true;
          break;
        }
      }
      if (!responded) dead.push(control.text || `${control.tag} #${control.index}`);
    }

    if (dead.length === 0) return [];
    return [
      {
        rule: "nav/buttons-work",
        severity: "error",
        viewport: viewport.name,
        message: `Nav controls do nothing when clicked on ${viewport.name}: ${dead.join(", ")}.`,
        fix: "Fix: give every nav button an onClick that glides to a section or opens something, or remove it. Links need an href.",
        evidence: { data: { dead } },
      },
    ];
  },
};

export default rule;
