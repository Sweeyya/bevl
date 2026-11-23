import { afterEach, beforeEach, describe, expect, it } from "vitest";
import tokensUsed from "../rules/brand/tokens-used.js";
import orderMatches from "../rules/html/order-matches.js";
import { FakeSite, restoreGlobals, snapshotGlobals } from "./helpers/fake-site.js";

beforeEach(snapshotGlobals);
afterEach(restoreGlobals);

const evaluating = (data: unknown) => ({ evaluate: () => data });

describe("html/order-matches", () => {
  const run = (data: unknown) => orderMatches.run(new FakeSite(evaluating(data)).context());
  const ids = ["a", "b", "c"];

  it("passes when DOM and nav follow the beats", async () => {
    expect(await run({ ids, dom: ids, nav: ids })).toEqual([]);
  });
  it("ignores sections missing from the DOM and unrelated links", async () => {
    expect(await run({ ids, dom: ["a", "", "c"], nav: ["a", "", "b", "c"] })).toEqual([]);
  });
  it("passes with no nav links", async () => {
    expect(await run({ ids, dom: ids, nav: [] })).toEqual([]);
  });
  it("fails when the DOM order differs", async () => {
    const [f] = await run({ ids, dom: ["b", "a", "c"], nav: ids });
    expect(f).toMatchObject({ rule: "html/order-matches", severity: "error" });
    expect(f?.message).toContain("HTML sections");
    expect(f?.fix).toContain("same order");
  });
  it("fails when the nav order differs", async () => {
    const [f] = await run({ ids, dom: ids, nav: ["c", "b", "a"] });
    expect(f?.message).toContain("nav links");
  });
  it("reports an error without a bridge", async () => {
    const [f] = await orderMatches.run(new FakeSite({ bridge: false }).context());
    expect(f?.message).toContain("Could not run");
  });
});

describe("brand/tokens-used", () => {
  const colors = { primary: "#e63946", secondary: "#2a9d8f", accent: "#457b9d" };
  const run = (data: unknown) => tokensUsed.run(new FakeSite(evaluating(data)).context());

  it("passes when every color is used", async () => {
    expect(await run({ colors, used: Object.values(colors) })).toEqual([]);
  });
  it("accepts a near color", async () => {
    expect(await run({ colors, used: ["#e53a46", "#2a9d8f", "#457b9d"] })).toEqual([]);
  });
  it("lists the unused colors", async () => {
    const [f] = await run({ colors, used: ["#e63946"] });
    expect(f).toMatchObject({ rule: "brand/tokens-used", severity: "warn" });
    expect(f?.message).toContain("secondary #2a9d8f");
    expect(f?.message).toContain("accent #457b9d");
    expect(f?.message).not.toContain("primary");
  });
  it("is skipped without a brand", async () => {
    expect(await run(null)).toEqual([]);
  });
});
