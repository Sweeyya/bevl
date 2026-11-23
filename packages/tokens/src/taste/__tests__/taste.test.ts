import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyDirection } from "../apply.js";
import { type Brief, readBrief, validateBrief, writeBrief } from "../brief.js";
import { dealDirection } from "../deal.js";
import { directions } from "../directions.js";

const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const brief = (patch: Partial<Brief> = {}): Brief => ({
  version: 1,
  name: "Test",
  kind: "venue",
  purpose: "",
  audience: "",
  tone: [],
  sections: [],
  colors: "choose",
  avoid: [],
  ...patch,
});

const unquoted = (stack: string): string => stack.replace(/["']/g, "");

describe("taste library", () => {
  it("has six directions with unique ids and font stacks", () => {
    expect(directions).toHaveLength(6);
    expect(new Set(directions.map((d) => d.id)).size).toBe(6);
    expect(new Set(directions.map((d) => d.fonts.heading)).size).toBe(6);
    expect(new Set(directions.map((d) => d.fonts.body)).size).toBe(6);
  });

  it("has at least two dark and two light directions", () => {
    const dark = directions.filter((d) => luminance(d.palette.background) < 0.1);
    const light = directions.filter((d) => luminance(d.palette.background) > 0.6);
    expect(dark.length).toBeGreaterThanOrEqual(2);
    expect(light.length).toBeGreaterThanOrEqual(2);
  });

  for (const d of directions) {
    it(`${d.id}: palette contrast`, () => {
      const p = d.palette;
      expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(7);
      expect(contrast(p.primary, p.background)).toBeGreaterThanOrEqual(3);
    });

    it(`${d.id}: values stay in range`, () => {
      expect(d.motion.snapDelay).toBeGreaterThanOrEqual(0);
      expect(d.motion.snapDelay).toBeLessThanOrEqual(5);
      expect(d.motion.snapDuration).toBeGreaterThanOrEqual(0);
      expect(d.motion.snapDuration).toBeLessThanOrEqual(5);
      for (const m of Object.values(d.materials)) {
        for (const v of Object.values(m)) expect(v).toBeGreaterThanOrEqual(0);
        expect(m.roughness).toBeLessThanOrEqual(1);
        expect(m.metalness).toBeLessThanOrEqual(1);
        expect(m.emissive).toBeLessThanOrEqual(1);
      }
      expect(d.scrollStyles.length).toBeGreaterThan(0);
    });
  }
});

describe("dealDirection", () => {
  it("is deterministic for the same seed", () => {
    const b = brief({ kind: "other" });
    expect(dealDirection(b, { seed: 7 }).id).toBe(dealDirection(b, { seed: 7 }).id);
  });

  it("matches kind and tone words", () => {
    expect(dealDirection(brief({ kind: "product", tone: ["premium"] }), { seed: 1 }).id).toBe(
      "showroom-black",
    );
    expect(dealDirection(brief({ kind: "venue", tone: ["Neon", "party"] }), { seed: 1 }).id).toBe(
      "afterglow",
    );
    expect(dealDirection(brief({ kind: "story", tone: ["calm"] }), { seed: 1 }).id).toBe(
      "stillwater",
    );
  });

  it("never repeats a direction in history until all are used", () => {
    const b = brief({ kind: "product" });
    const seen: string[] = [];
    for (let i = 0; i < directions.length; i++) {
      const id = dealDirection(b, { seed: i, history: seen }).id;
      expect(seen).not.toContain(id);
      seen.push(id);
    }
    expect(dealDirection(b, { seed: 1, history: seen })).toBeDefined();
  });

  it("uses the seed to break ties", () => {
    const b = brief({ kind: "other", tone: [] });
    const ids = new Set(Array.from({ length: 40 }, (_, s) => dealDirection(b, { seed: s }).id));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe("validateBrief", () => {
  it("accepts a minimal brief and fills defaults", () => {
    const r = validateBrief({ version: 1, name: "X", kind: "venue", colors: "choose" });
    expect(r.ok && r.brief.tone).toEqual([]);
  });

  it("reports a Fix line for every error", () => {
    const r = validateBrief({ version: 2, name: "", kind: "blog", colors: "x", extra: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(4);
      for (const e of r.errors) expect(e).toContain("Fix:");
    }
  });
});

describe("applyDirection", () => {
  it("writes brand tokens and records direction and history", async () => {
    const dir = mkdtempSync(join(tmpdir(), "toros-taste-"));
    writeFileSync(join(dir, "toros.json"), JSON.stringify({ sections: [] }));
    await import("node:fs/promises").then((fs) => fs.mkdir(join(dir, "src")));
    const b = brief({ history: ["afterglow"] });
    await writeBrief(dir, b);
    const d = directions.find((x) => x.id === "stillwater");
    if (!d) throw new Error("missing");
    await applyDirection({ dir, brief: b, direction: d });
    const tokens = JSON.parse(readFileSync(join(dir, "src/brand.tokens.json"), "utf8"));
    expect(tokens.colors.background).toBe(d.palette.background);
    expect(tokens.colors.primary).toBe(d.palette.primary);
    expect(tokens.fonts.heading).toBe(unquoted(d.fonts.heading));
    expect(tokens.fonts.body).toBe(unquoted(d.fonts.body));
    const saved = await readBrief(dir);
    expect(saved.direction).toBe("stillwater");
    expect(saved.history).toEqual(["afterglow", "stillwater"]);
  });
});
