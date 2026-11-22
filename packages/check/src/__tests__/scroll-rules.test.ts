import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Rule } from "../rule.js";
import deterministic from "../rules/scroll/deterministic.js";
import motionAllowances from "../rules/scroll/motion-allowances.js";
import noJumps from "../rules/scroll/no-jumps.js";
import noRoll from "../rules/scroll/no-roll.js";
import reaches from "../rules/scroll/reaches-every-section.js";
import snapNoTrap from "../rules/scroll/snap-no-trap.js";
import snapSettles from "../rules/scroll/snap-settles.js";
import {
  FakeSite,
  type FakeSiteOptions,
  flyForward,
  restoreGlobals,
  snapshotGlobals,
} from "./helpers/fake-site.js";

beforeEach(snapshotGlobals);
afterEach(restoreGlobals);

const nearestBeat = (beats: number[]) => (p: number) =>
  beats.reduce((best, b) => (Math.abs(b - p) < Math.abs(best - p) ? b : best), beats[0] ?? 0);

const run = (rule: Rule, opts: FakeSiteOptions = {}) => rule.run(new FakeSite(opts).context());

function expectCouldNotRun(findings: Awaited<ReturnType<typeof run>>, id: string) {
  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({ rule: id, severity: "error" });
  expect(findings[0]?.message).toContain("Could not run");
  expect(findings[0]?.fix).toMatch(/^Fix:/);
}

describe("could-not-run paths", () => {
  for (const rule of [noJumps, noRoll, reaches, snapSettles, snapNoTrap, motionAllowances]) {
    it(`${rule.id} reports an error when there is no bridge`, async () => {
      expectCouldNotRun(await run(rule, { bridge: false }), rule.id);
    });
  }
  for (const rule of [noJumps, noRoll, reaches, snapSettles]) {
    it(`${rule.id} reports an error when nothing scrolls`, async () => {
      expectCouldNotRun(await run(rule, { scroller: false }), rule.id);
      expectCouldNotRun(await run(rule, { maxScroll: 0 }), rule.id);
    });
  }
});

const teleport = (p: number) => ({
  ...flyForward(p),
  position: { x: 0, y: 0, z: p > 0.5 ? -50 : 0 },
});

describe("scroll/no-jumps", () => {
  it("passes a smooth path", async () => expect(await run(noJumps)).toEqual([]));
  it("fails a teleporting camera", async () => {
    const [f] = await run(noJumps, { pose: teleport });
    expect(f?.message).toContain("jumped");
  });
  it("allows a step at the limit", async () => {
    const pose = (p: number) => ({ ...flyForward(p), position: { x: 0, y: 0, z: -60 * p } });
    expect(await run(noJumps, { pose })).toEqual([]);
  });
  it("skips when fastMoves is allowed", async () => {
    expect(await run(noJumps, { pose: teleport, allow: { fastMoves: true } })).toEqual([]);
  });
});

describe("scroll/no-roll", () => {
  const rolled = (p: number) => ({
    ...flyForward(p),
    quaternion: { x: 0, y: 0, z: Math.sin(0.2), w: Math.cos(0.2) },
  });
  it("passes without roll", async () => expect(await run(noRoll)).toEqual([]));
  it("fails a rolled camera", async () => {
    const [f] = await run(noRoll, { pose: rolled });
    expect(f?.message).toContain("rolled");
  });
  it("skips when roll is allowed", async () => {
    expect(await run(noRoll, { pose: rolled, allow: { roll: true } })).toEqual([]);
  });
});

describe("scroll/reaches-every-section", () => {
  it("passes when every beat is reached with its pose", async () => {
    expect(await run(reaches)).toEqual([]);
  });
  it("lists the sections whose progress is clamped short of the anchor", async () => {
    const [f] = await run(reaches, { settle: (p) => Math.min(p, 0.6) });
    expect(f?.message).toContain("s2");
    expect(f?.message).not.toContain("s1");
  });
  it("lists sections whose camera is not at the choreography pose", async () => {
    const [f] = await run(reaches, { camera: () => flyForward(0) });
    expect(f?.message).toContain("s1");
    expect(f?.message).toContain("s2");
    expect(f?.message).not.toContain("s0");
  });
  it("does not compare the camera pose when behaviors move the camera", async () => {
    expect(await run(reaches, { camera: () => flyForward(0), behaviors: ["sway"] })).toEqual([]);
  });
  it("lists sections without a DOM anchor", async () => {
    const [f] = await run(reaches, { domIds: ["s0", "s2"] });
    expect(f?.message).toContain("s1");
  });
  it("reports an error when the bridge has no sections", async () => {
    expectCouldNotRun(await run(reaches, { beats: [] }), reaches.id);
  });
});

describe("scroll/snap-settles", () => {
  it("passes when progress snaps to a beat", async () => {
    expect(await run(snapSettles, { settle: nearestBeat([0, 0.5, 1]) })).toEqual([]);
  });
  it("warns when progress rests between beats", async () => {
    const [f] = await run(snapSettles);
    expect(f).toMatchObject({ rule: "scroll/snap-settles", severity: "warn" });
  });
  it("skips beats that opt out of snapping", async () => {
    expect(await run(snapSettles, { beatSnap: [false, false, false] })).toEqual([]);
  });
});

describe("scroll/snap-no-trap", () => {
  it("passes when keyboard and wheel can leave every beat", async () => {
    expect(await run(snapNoTrap, { settle: nearestBeat([0, 0.5, 1]) })).toEqual([]);
  });
  it("fails when a wheel gesture goes nowhere", async () => {
    const [f] = await run(snapNoTrap, { onWheel: () => undefined });
    expect(f?.message).toContain("wheel");
  });
  it("reports an error when the keyboard cannot reach a beat to test it", async () => {
    expectCouldNotRun(await run(snapNoTrap, { deadKeys: ["ArrowDown"] }), snapNoTrap.id);
  });
  it("passes a single beat", async () => {
    expect(await run(snapNoTrap, { beats: [0] })).toEqual([]);
  });
});

describe("scroll/deterministic", () => {
  const browserOf = (make: () => FakeSite) => ({
    newContext: async () => ({
      newPage: async () => make().page(),
      close: async () => undefined,
    }),
  });
  it("reports an error without a browser", async () => {
    expectCouldNotRun(await run(deterministic), deterministic.id);
  });
  it("passes when both loads agree", async () => {
    expect(await run(deterministic, { browser: browserOf(() => new FakeSite()) })).toEqual([]);
  });
  it("fails when loads differ", async () => {
    let n = 0;
    const browser = browserOf(() => {
      n += 1;
      const x = n * 0.1;
      return new FakeSite({ pose: (p) => ({ ...flyForward(p), position: { x, y: 0, z: -p } }) });
    });
    const [f] = await run(deterministic, { browser });
    expect(f?.message).toContain("differ");
  });
  it("reports an error when a load has no bridge", async () => {
    let n = 0;
    const browser = browserOf(() => new FakeSite({ bridge: n++ === 0 }));
    expectCouldNotRun(await run(deterministic, { browser }), deterministic.id);
  });
});

describe("scroll/motion-allowances", () => {
  it("reports nothing without allowances", async () => {
    expect(await run(motionAllowances)).toEqual([]);
  });
  it("reports each allowance as info", async () => {
    const found = await run(motionAllowances, { allow: { roll: true, spin: true } });
    expect(found.map((f) => f.severity)).toEqual(["info", "info"]);
    expect(found.map((f) => f.message).join()).toContain("allow.roll");
  });
});
