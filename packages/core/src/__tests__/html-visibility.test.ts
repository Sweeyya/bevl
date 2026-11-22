import { describe, expect, it } from "vitest";
import { activeSection, sectionStyle, sectionVisibility } from "../html/visibility.js";

const beats = [0, 0.5, 1];

describe("sectionVisibility", () => {
  it("is 1 at the beat and 0 a gap away", () => {
    expect(sectionVisibility(0.5, beats, 1)).toBe(1);
    expect(sectionVisibility(0, beats, 1)).toBe(0);
    expect(sectionVisibility(1, beats, 1)).toBe(0);
  });
  it("fades between the plateau and the neighbour", () => {
    expect(sectionVisibility(0.25, beats, 1)).toBe(1);
    expect(sectionVisibility(0.125, beats, 1)).toBeCloseTo(0.5);
  });
  it("shows a single section fully near its beat", () => {
    expect(sectionVisibility(0, [0], 0)).toBe(1);
  });
  it("is 0 for an unknown index", () => {
    expect(sectionVisibility(0, beats, 9)).toBe(0);
  });
});

describe("activeSection", () => {
  it("picks the nearest beat, ties to the earlier", () => {
    expect(activeSection(0.1, beats)).toBe(0);
    expect(activeSection(0.25, beats)).toBe(0);
    expect(activeSection(0.9, beats)).toBe(2);
  });
});

describe("sectionStyle", () => {
  it("shifts while fading in with motion allowed", () => {
    const s = sectionStyle(0.125, beats, 1, false);
    expect(s.opacity).toBeCloseTo(0.5);
    expect(s.translateY).toBeGreaterThan(0);
  });
  it("switches instantly without shift under reduced motion", () => {
    expect(sectionStyle(0.1, beats, 1, true)).toEqual({
      opacity: 0,
      translateY: 0,
      active: false,
    });
    expect(sectionStyle(0.5, beats, 1, true)).toEqual({ opacity: 1, translateY: 0, active: true });
  });
});
