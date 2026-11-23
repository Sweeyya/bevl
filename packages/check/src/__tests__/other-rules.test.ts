import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Rule } from "../rule.js";
import keyboardReachesBeats from "../rules/a11y/keyboard-reaches-beats.js";
import notDefaultLook from "../rules/brand/not-default-look.js";
import drawCalls from "../rules/budgets/draw-calls.js";
import triangles from "../rules/budgets/triangles.js";
import consoleErrors from "../rules/load/console-errors.js";
import ready from "../rules/load/ready.js";
import webgl from "../rules/load/webgl.js";
import noNan from "../rules/render/no-nan.js";
import notBlank from "../rules/render/not-blank.js";
import {
  FakeSite,
  type FakeSiteOptions,
  flyForward,
  restoreGlobals,
  snapshotGlobals,
} from "./helpers/fake-site.js";

beforeEach(snapshotGlobals);
afterEach(restoreGlobals);

const run = (rule: Rule, opts: FakeSiteOptions = {}) => rule.run(new FakeSite(opts).context());

function expectCouldNotRun(findings: Awaited<ReturnType<typeof run>>, id: string) {
  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({ rule: id, severity: "error" });
  expect(findings[0]?.message).toContain("Could not run");
}

describe("a11y/keyboard-reaches-beats", () => {
  it("passes when keys reach every beat", async () => {
    expect(await run(keyboardReachesBeats)).toEqual([]);
  });
  it("fails when End is ignored", async () => {
    const [f] = await run(keyboardReachesBeats, { deadKeys: ["End"] });
    expect(f?.message).toContain("End");
  });
  it("reports an error without a bridge or sections", async () => {
    expectCouldNotRun(await run(keyboardReachesBeats, { bridge: false }), keyboardReachesBeats.id);
    expectCouldNotRun(await run(keyboardReachesBeats, { beats: [] }), keyboardReachesBeats.id);
  });
});

describe("budgets", () => {
  it("triangles: passes, warns above 90%, fails above the budget", async () => {
    expect(await run(triangles, { stats: { triangles: 1000, drawCalls: 1 } })).toEqual([]);
    const [warn] = await run(triangles, { stats: { triangles: 460_000, drawCalls: 1 } });
    expect(warn?.severity).toBe("warn");
    const [fail] = await run(triangles, { stats: { triangles: 600_000, drawCalls: 1 } });
    expect(fail?.severity).toBe("error");
  });
  it("triangles: phone budget is lower", async () => {
    const found = await run(triangles, {
      stats: { triangles: 200_000, drawCalls: 1 },
      viewport: { isMobile: true },
    });
    expect(found[0]?.severity).toBe("error");
  });
  it("draw-calls: passes and fails around the budget", async () => {
    expect(await run(drawCalls, { stats: { triangles: 1, drawCalls: 200 } })).toEqual([]);
    const [f] = await run(drawCalls, { stats: { triangles: 1, drawCalls: 201 } });
    expect(f?.severity).toBe("error");
    const phone = await run(drawCalls, {
      stats: { triangles: 1, drawCalls: 100 },
      viewport: { isMobile: true },
    });
    expect(phone).toHaveLength(1);
  });
  it("report an error instead of passing when there is no bridge", async () => {
    expectCouldNotRun(await run(triangles, { bridge: false }), triangles.id);
    expectCouldNotRun(await run(drawCalls, { bridge: false }), drawCalls.id);
  });
});

describe("render/no-nan", () => {
  it("passes a finite camera", async () => expect(await run(noNan)).toEqual([]));
  it("fails a NaN camera", async () => {
    const camera = () => ({ ...flyForward(0), position: { x: Number.NaN, y: 0, z: 0 } });
    expect(await run(noNan, { camera })).toHaveLength(1);
  });
  it("fails a NaN beat pose", async () => {
    const pose = (p: number) => ({ ...flyForward(p), position: { x: 0, y: Number.NaN, z: 0 } });
    expect(await run(noNan, { pose })).toHaveLength(1);
  });
  it("reports an error without a bridge", async () => {
    expectCouldNotRun(await run(noNan, { bridge: false }), noNan.id);
  });
});

describe("render/not-blank", () => {
  const decoded = (result: boolean | null): FakeSiteOptions => ({
    evaluate: (fn, arg) =>
      arg && typeof arg === "object" && "dataUrl" in arg
        ? result
        : (fn as (a: unknown) => unknown)(arg),
  });
  it("passes a varied screenshot", async () => {
    expect(await run(notBlank, decoded(false))).toEqual([]);
  });
  it("fails a flat screenshot", async () => {
    const [f] = await run(notBlank, decoded(true));
    expect(f?.message).toContain("single flat color");
  });
  it("reports an error when the screenshot cannot be decoded", async () => {
    expectCouldNotRun(await run(notBlank, decoded(null)), notBlank.id);
  });
  it("reports an error when the screenshot fails", async () => {
    const [f] = await run(notBlank, { screenshot: new Error("boom") });
    expect(f).toMatchObject({ severity: "error", message: expect.stringContaining("screenshot") });
  });
  it("reports an error without a bridge", async () => {
    expectCouldNotRun(await run(notBlank, { bridge: false }), notBlank.id);
  });
});

describe("load/ready", () => {
  it("passes when the bridge is ready", async () => expect(await run(ready)).toEqual([]));
  it("fails with a Fix that explains testMode when the bridge never appears", async () => {
    const [f] = await run(ready, { bridge: false });
    expect(f?.severity).toBe("error");
    expect(f?.fix).toContain("testMode");
    expect(f?.fix).toContain('"never"');
  });
});

describe("load/console-errors", () => {
  it("passes without errors", async () => expect(await run(consoleErrors)).toEqual([]));
  it("reports each console error", async () => {
    const found = await run(consoleErrors, { consoleErrors: ["a", "b"] });
    expect(found.map((f) => f.message)).toEqual([
      "Console error during load: a",
      "Console error during load: b",
    ]);
  });
  it("reports an error when the page cannot be read", async () => {
    expectCouldNotRun(
      await run(consoleErrors, {
        evaluate: () => {
          throw new Error("closed");
        },
      }),
      consoleErrors.id,
    );
  });
});

describe("load/webgl", () => {
  const gl = (result: { supported: boolean; renderer: string | null }): FakeSiteOptions => ({
    evaluate: () => result,
  });
  it("passes on a GPU renderer", async () => {
    expect(await run(webgl, gl({ supported: true, renderer: "Apple M2" }))).toEqual([]);
  });
  it("reports info on a software renderer", async () => {
    const [f] = await run(webgl, gl({ supported: true, renderer: "SwiftShader" }));
    expect(f?.severity).toBe("info");
  });
  it("fails without WebGL2", async () => {
    const [f] = await run(webgl, gl({ supported: false, renderer: null }));
    expect(f?.severity).toBe("error");
  });
});

describe("brand/not-default-look", () => {
  const gray = [{ name: "m", colors: ["#ffffff", "#808080"] }];
  const colored = [{ name: "m", colors: ["#e63946"] }];
  const defaults = {
    colors: {
      primary: "#000000",
      secondary: "#333333",
      accent: "#0066ff",
      background: "#ffffff",
      surface: "#f5f5f5",
      text: "#111111",
    },
  };

  it("warns when there is no brand and every material is gray or white", async () => {
    const [f] = await run(notDefaultLook, { materials: gray });
    expect(f?.severity).toBe("warn");
    expect(f?.fix).toContain("toros taste deal --brief toros.brief.json --apply");
  });
  it("warns when the brand is only the parser defaults", async () => {
    expect(await run(notDefaultLook, { brand: defaults, materials: gray })).toHaveLength(1);
  });
  it("passes with real brand tokens, real colors, or no materials", async () => {
    const brand = { colors: { ...defaults.colors, primary: "#e63946" } };
    expect(await run(notDefaultLook, { brand, materials: gray })).toEqual([]);
    expect(await run(notDefaultLook, { materials: colored })).toEqual([]);
    expect(await run(notDefaultLook)).toEqual([]);
  });
  it("reports an error without a bridge", async () => {
    expectCouldNotRun(await run(notDefaultLook, { bridge: false }), notDefaultLook.id);
  });
});
